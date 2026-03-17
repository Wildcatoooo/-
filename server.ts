import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
const CLASSES_FILE = path.join(DATA_DIR, "classes.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// Initial data load
let classes: any[] = [];
if (fs.existsSync(CLASSES_FILE)) {
  try {
    classes = JSON.parse(fs.readFileSync(CLASSES_FILE, "utf-8"));
  } catch (e) {
    console.error("Error loading classes:", e);
  }
}

function saveClasses() {
  fs.writeFileSync(CLASSES_FILE, JSON.stringify(classes, null, 2));
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  // In-memory state for active sessions
  let activeStudents: any[] = [];
  let exams: any[] = [];
  let submissions: any[] = [];
  let examResults: any[] = [];

  // Socket.io logic
  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Send initial data
    socket.emit("admin:classes", classes);
    socket.emit("admin:exams", exams);
    socket.emit("admin:exam_results", examResults);

    socket.on("admin:save_classes", (newClasses) => {
      classes = newClasses;
      saveClasses();
      io.emit("admin:classes", classes);
    });

    socket.on("student:login", (data) => {
      // Check if student exists in any class
      const studentExists = classes.some(c => c.students.includes(data.name));
      
      if (!studentExists) {
        socket.emit("student:error", "未找到该学生：姓名不在名单中，请联系老师。");
        return;
      }

      const alreadyOnline = activeStudents.find(s => s.name === data.name && s.status === "online");
      if (alreadyOnline) {
        socket.emit("student:error", "该学生已在其他设备登录，请先退出或联系老师。");
        return;
      }

      const student = {
        id: socket.id,
        name: data.name,
        status: "online",
        lastSeen: new Date(),
      };
      activeStudents = activeStudents.filter(s => s.name !== data.name);
      activeStudents.push(student);
      io.emit("admin:students", activeStudents);
      socket.emit("student:confirmed", student);
    });

    socket.on("student:logout", () => {
      activeStudents = activeStudents.map(s => s.id === socket.id ? { ...s, status: "offline" } : s);
      io.emit("admin:students", activeStudents);
    });

    socket.on("admin:get_students", () => {
      socket.emit("admin:students", activeStudents);
    });

    socket.on("admin:start_exam", (examData) => {
      const newExam = { ...examData, id: Date.now().toString(), active: true };
      exams.push(newExam);
      io.emit("student:exam_started", newExam);
      io.emit("admin:exams", exams);
    });

    socket.on("student:submit_homework", (submission) => {
      const newSubmission = { 
        ...submission, 
        id: Date.now().toString(), 
        timestamp: new Date() 
      };
      submissions.push(newSubmission);
      io.emit("admin:submissions", submissions);
    });

    socket.on("student:submit_exam", (result) => {
      const newResult = {
        ...result,
        id: Date.now().toString(),
        timestamp: new Date()
      };
      examResults.push(newResult);
      io.emit("admin:exam_results", examResults);
    });

    socket.on("disconnect", () => {
      activeStudents = activeStudents.map(s => s.id === socket.id ? { ...s, status: "offline" } : s);
      io.emit("admin:students", activeStudents);
      console.log("User disconnected:", socket.id);
    });
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
