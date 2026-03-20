import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
const FILES = {
  CLASSES: path.join(DATA_DIR, "classes.json"),
  EXAMS: path.join(DATA_DIR, "exams.json"),
  RESULTS: path.join(DATA_DIR, "results.json"),
  SUBMISSIONS: path.join(DATA_DIR, "submissions.json"),
  DISTRIBUTED_FILES: path.join(DATA_DIR, "distributed_files.json"),
};

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  const PORT = 3000;

  // Data persistence helpers
  const saveData = (filePath: string, data: any) => {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error(`Error saving to ${filePath}:`, e);
    }
  };

  const loadData = (filePath: string, defaultValue: any = []) => {
    if (fs.existsSync(filePath)) {
      try {
        return JSON.parse(fs.readFileSync(filePath, "utf-8"));
      } catch (e) {
        console.error(`Error loading from ${filePath}:`, e);
      }
    }
    return defaultValue;
  };

  // State
  let classes = loadData(FILES.CLASSES);
  let exams = loadData(FILES.EXAMS);
  let examResults = loadData(FILES.RESULTS);
  let submissions = loadData(FILES.SUBMISSIONS);
  let distributedFiles = loadData(FILES.DISTRIBUTED_FILES);
  let activeStudents: any[] = [];

  // Socket.io logic
  io.on("connection", (socket) => {
    // Send initial data
    socket.emit("admin:classes", classes);
    socket.emit("admin:exams", exams);
    socket.emit("admin:exam_results", examResults);
    socket.emit("admin:submissions", submissions);
    socket.emit("admin:distributed_files", distributedFiles);

    socket.on("admin:save_classes", (newClasses) => {
      classes = newClasses;
      saveData(FILES.CLASSES, classes);
      io.emit("admin:classes", classes);
    });

    socket.on("student:login", (data) => {
      const studentClass = classes.find((c: any) => c.students.includes(data.name));
      
      if (!studentClass) {
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
        className: studentClass.name,
        status: "online",
        lastSeen: new Date(),
      };
      
      activeStudents = activeStudents.filter(s => s.name !== data.name);
      activeStudents.push(student);
      
      // Join room for the class
      socket.join(studentClass.name);
      
      io.emit("admin:students", activeStudents);
      socket.emit("student:confirmed", student);
      
      // Send relevant distributed files
      const studentFiles = distributedFiles.filter(f => 
        f.target === "all" || 
        (f.target === "class" && f.targetId === studentClass.name) ||
        (f.target === "student" && f.targetId === data.name)
      );
      socket.emit("student:received_files", studentFiles);

      // Send active exam
      const activeExam = exams.find((e: any) => e.active);
      if (activeExam) socket.emit("student:exam_started", activeExam);
    });

    socket.on("student:logout", () => {
      activeStudents = activeStudents.map(s => s.id === socket.id ? { ...s, status: "offline" } : s);
      io.emit("admin:students", activeStudents);
    });

    socket.on("admin:get_students", () => {
      socket.emit("admin:students", activeStudents);
    });

    socket.on("admin:start_exam", (examData) => {
      const newExam = { 
        ...examData, 
        id: Date.now().toString(), 
        active: true,
        startTime: Date.now()
      };
      exams.push(newExam);
      saveData(FILES.EXAMS, exams);
      io.emit("student:exam_started", newExam);
      io.emit("admin:exams", exams);
    });

    socket.on("admin:stop_exam", (id) => {
      exams = exams.map((e: any) => e.id === id ? { ...e, active: false } : e);
      saveData(FILES.EXAMS, exams);
      io.emit("admin:exams", exams);
      io.emit("student:exam_stopped", id);
    });

    socket.on("student:submit_homework", (submission) => {
      const student = activeStudents.find(s => s.id === socket.id);
      const newSubmission = { 
        ...submission, 
        id: Date.now().toString(), 
        className: student?.className || "未知班级",
        timestamp: new Date() 
      };
      submissions.push(newSubmission);
      saveData(FILES.SUBMISSIONS, submissions);
      io.emit("admin:submissions", submissions);
    });

    socket.on("student:submit_exam", (result) => {
      const newResult = {
        ...result,
        id: Date.now().toString(),
        timestamp: new Date()
      };
      examResults.push(newResult);
      saveData(FILES.RESULTS, examResults);
      io.emit("admin:exam_results", examResults);
    });

    socket.on("student:progress_update", (progress) => {
      activeStudents = activeStudents.map(s => s.id === socket.id ? { ...s, examProgress: progress } : s);
      io.emit("admin:students", activeStudents);
    });

    socket.on("admin:distribute_file", (fileData) => {
      const newFile = {
        ...fileData,
        id: Date.now().toString(),
        timestamp: new Date()
      };
      distributedFiles.push(newFile);
      saveData(FILES.DISTRIBUTED_FILES, distributedFiles);
      io.emit("admin:distributed_files", distributedFiles);
      
      if (fileData.target === "all") {
        io.emit("student:new_file", newFile);
      } else if (fileData.target === "class") {
        io.to(fileData.targetId).emit("student:new_file", newFile);
      } else if (fileData.target === "student") {
        const targetStudent = activeStudents.find(s => s.name === fileData.targetId);
        if (targetStudent) io.to(targetStudent.id).emit("student:new_file", newFile);
      }
    });

    socket.on("admin:delete_distributed_file", (id) => {
      distributedFiles = distributedFiles.filter(f => f.id !== id);
      saveData(FILES.DISTRIBUTED_FILES, distributedFiles);
      io.emit("admin:distributed_files", distributedFiles);
    });

    socket.on("admin:lock_student", (data) => {
      activeStudents = activeStudents.map(s => s.id === data.studentId ? { ...s, locked: data.locked } : s);
      io.emit("admin:students", activeStudents);
      io.to(data.studentId).emit("student:lock_status", data.locked);
    });

    socket.on("admin:broadcast_message", (message) => {
      io.emit("student:broadcast", message);
    });

    socket.on("admin:grade_submission", (data) => {
      submissions = submissions.map((s: any) => s.id === data.submissionId ? { ...s, grade: data.grade, feedback: data.feedback } : s);
      saveData(FILES.SUBMISSIONS, submissions);
      io.emit("admin:submissions", submissions);
    });

    socket.on("disconnect", () => {
      activeStudents = activeStudents.map(s => s.id === socket.id ? { ...s, status: "offline" } : s);
      io.emit("admin:students", activeStudents);
    });
  });

  // API Routes
  app.get("/api/health", (req, res) => res.json({ status: "ok" }));

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  // Auto-stop exams check
  setInterval(() => {
    let changed = false;
    exams = exams.map((e: any) => {
      if (e.active && e.duration && e.startTime) {
        const elapsed = (Date.now() - e.startTime) / 1000;
        if (elapsed >= e.duration * 60) {
          changed = true;
          io.emit("student:exam_stopped", e.id);
          return { ...e, active: false };
        }
      }
      return e;
    });
    if (changed) {
      saveData(FILES.EXAMS, exams);
      io.emit("admin:exams", exams);
    }
  }, 5000);

  httpServer.listen(PORT, "0.0.0.0", () => console.log(`Server running on http://localhost:${PORT}`));
}

startServer();
