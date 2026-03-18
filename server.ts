import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
const CLASSES_FILE = path.join(DATA_DIR, "classes.json");
const EXAMS_FILE = path.join(DATA_DIR, "exams.json");
const RESULTS_FILE = path.join(DATA_DIR, "results.json");
const SUBMISSIONS_FILE = path.join(DATA_DIR, "submissions.json");
const DISTRIBUTED_FILES_FILE = path.join(DATA_DIR, "distributed_files.json");

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

function saveExams(exams: any[]) {
  fs.writeFileSync(EXAMS_FILE, JSON.stringify(exams, null, 2));
}

function saveResults(results: any[]) {
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
}

function saveSubmissions(submissions: any[]) {
  fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));
}

function saveDistributedFiles(files: any[]) {
  fs.writeFileSync(DISTRIBUTED_FILES_FILE, JSON.stringify(files, null, 2));
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
  let distributedFiles: any[] = [];

  // Load persisted data
  if (fs.existsSync(EXAMS_FILE)) {
    try {
      exams = JSON.parse(fs.readFileSync(EXAMS_FILE, "utf-8"));
    } catch (e) { console.error("Error loading exams:", e); }
  }
  if (fs.existsSync(RESULTS_FILE)) {
    try {
      examResults = JSON.parse(fs.readFileSync(RESULTS_FILE, "utf-8"));
    } catch (e) { console.error("Error loading results:", e); }
  }
  if (fs.existsSync(SUBMISSIONS_FILE)) {
    try {
      submissions = JSON.parse(fs.readFileSync(SUBMISSIONS_FILE, "utf-8"));
    } catch (e) { console.error("Error loading submissions:", e); }
  }
  if (fs.existsSync(DISTRIBUTED_FILES_FILE)) {
    try {
      distributedFiles = JSON.parse(fs.readFileSync(DISTRIBUTED_FILES_FILE, "utf-8"));
    } catch (e) { console.error("Error loading distributed files:", e); }
  }

  // Socket.io logic
  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Send initial data
    socket.emit("admin:classes", classes);
    socket.emit("admin:exams", exams);
    socket.emit("admin:exam_results", examResults);
    socket.emit("admin:submissions", submissions);
    socket.emit("admin:distributed_files", distributedFiles);

    socket.on("admin:save_classes", (newClasses) => {
      classes = newClasses;
      saveClasses();
      io.emit("admin:classes", classes);
    });

    socket.on("student:login", (data) => {
      // Check if student exists in any class
      const studentClass = classes.find(c => c.students.includes(data.name));
      
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
      io.emit("admin:students", activeStudents);
      socket.emit("student:confirmed", student);
      
      // Send relevant distributed files to student
      const studentFiles = distributedFiles.filter(f => 
        f.target === "all" || 
        (f.target === "class" && f.targetId === studentClass.name) ||
        (f.target === "student" && f.targetId === data.name)
      );
      socket.emit("student:received_files", studentFiles);

      // Send active exam if any
      const activeExam = exams.find(e => e.active);
      if (activeExam) {
        socket.emit("student:exam_started", activeExam);
      }
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
      saveExams(exams);
      io.emit("student:exam_started", newExam);
      io.emit("admin:exams", exams);
    });

    socket.on("admin:stop_exam", (id) => {
      exams = exams.map(e => e.id === id ? { ...e, active: false } : e);
      saveExams(exams);
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
      saveSubmissions(submissions);
      io.emit("admin:submissions", submissions);
    });

    socket.on("student:submit_exam", (result) => {
      const newResult = {
        ...result,
        id: Date.now().toString(),
        timestamp: new Date()
      };
      examResults.push(newResult);
      saveResults(examResults);
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
      saveDistributedFiles(distributedFiles);
      io.emit("admin:distributed_files", distributedFiles);
      
      // Notify relevant students
      if (fileData.target === "all") {
        io.emit("student:received_files", distributedFiles.filter(f => f.target === "all" || f.target === "class" || f.target === "student")); // Simplified: just send all relevant to everyone or filter properly
        // Better: broadcast to everyone, they will filter or we send specifically
        io.emit("student:new_file", newFile);
      } else if (fileData.target === "class") {
        activeStudents.forEach(s => {
          if (s.className === fileData.targetId) {
            io.to(s.id).emit("student:new_file", newFile);
          }
        });
      } else if (fileData.target === "student") {
        const targetStudent = activeStudents.find(s => s.name === fileData.targetId);
        if (targetStudent) {
          io.to(targetStudent.id).emit("student:new_file", newFile);
        }
      }
    });

    socket.on("admin:delete_distributed_file", (id) => {
      distributedFiles = distributedFiles.filter(f => f.id !== id);
      saveDistributedFiles(distributedFiles);
      io.emit("admin:distributed_files", distributedFiles);
    });

    socket.on("admin:lock_student", (data) => {
      // data: { studentId: string, locked: boolean }
      activeStudents = activeStudents.map(s => s.id === data.studentId ? { ...s, locked: data.locked } : s);
      io.emit("admin:students", activeStudents);
      io.to(data.studentId).emit("student:lock_status", data.locked);
    });

    socket.on("admin:broadcast_message", (message) => {
      io.emit("student:broadcast", message);
    });

    socket.on("admin:grade_submission", (data) => {
      // data: { submissionId: string, grade: string, feedback: string }
      submissions = submissions.map(s => s.id === data.submissionId ? { ...s, grade: data.grade, feedback: data.feedback } : s);
      saveSubmissions(submissions);
      io.emit("admin:submissions", submissions);
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

  // Auto-stop exams check
  setInterval(() => {
    let changed = false;
    exams = exams.map(e => {
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
      saveExams(exams);
      io.emit("admin:exams", exams);
    }
  }, 5000);

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
