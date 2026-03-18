import express from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";
import { db, migrate } from "./db.js";
import { seedAdmin } from "./seed.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

migrate();
seedAdmin();

const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: "change-me-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true }
}));
app.use("/static", express.static(path.join(__dirname, "public")));

function requireAdmin(req, res, next) {
  if (!req.session.adminId) return res.redirect("/login");
  next();
}

app.get("/", (req,res)=> res.redirect("/dashboard"));

app.get("/login", (req,res)=> res.render("login", { error: null }));

app.post("/login", (req,res)=>{
  const { username, password } = req.body;
  const admin = db.prepare("SELECT * FROM admins WHERE username=?").get(username);
  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.render("login", { error: "Invalid credentials" });
  }
  req.session.adminId = admin.id;
  res.redirect("/dashboard");
});

app.post("/logout", (req,res)=> req.session.destroy(()=> res.redirect("/login")));

app.get("/dashboard", requireAdmin, (req,res)=>{
  const total = db.prepare("SELECT COUNT(*) as c FROM employees").get().c;
  const byDept = db.prepare("SELECT department, COUNT(*) as c FROM employees GROUP BY department ORDER BY c DESC").all();
  res.render("dashboard", { total, byDept });
});

app.get("/employees", requireAdmin, (req,res)=>{
  const q = (req.query.q || "").trim();
  const where = q ? "WHERE full_name LIKE ? OR email LIKE ? OR department LIKE ? OR role LIKE ?" : "";
  const params = q ? [`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`] : [];
  const rows = db.prepare(`SELECT * FROM employees ${where} ORDER BY id DESC LIMIT 200`).all(...params);
  res.render("employees", { rows, q });
});

app.get("/employees/new", requireAdmin, (req,res)=> res.render("employee_form", { employee: null, error: null }));

app.post("/employees/new", requireAdmin, (req,res)=>{
  try{
    const { full_name, email, phone, department, role, salary, hired_date } = req.body;
    if(!full_name || !email || !phone || !department || !role || !hired_date) {
      return res.render("employee_form", { employee: req.body, error: "All fields except salary are required." });
    }
    db.prepare(`INSERT INTO employees(full_name,email,phone,department,role,salary,hired_date,created_at)
                VALUES(?,?,?,?,?,?,?,?)`)
      .run(full_name, email, phone, department, role, Number(salary||0), hired_date, new Date().toISOString());
    res.redirect("/employees");
  } catch(e){
    res.render("employee_form", { employee: req.body, error: "Could not create employee (email must be unique)." });
  }
});

app.get("/employees/:id/edit", requireAdmin, (req,res)=>{
  const emp = db.prepare("SELECT * FROM employees WHERE id=?").get(Number(req.params.id));
  if(!emp) return res.status(404).send("Not found");
  res.render("employee_form", { employee: emp, error: null });
});

app.post("/employees/:id/edit", requireAdmin, (req,res)=>{
  const id = Number(req.params.id);
  try{
    const { full_name, email, phone, department, role, salary, hired_date } = req.body;
    db.prepare(`UPDATE employees SET full_name=?, email=?, phone=?, department=?, role=?, salary=?, hired_date=? WHERE id=?`)
      .run(full_name, email, phone, department, role, Number(salary||0), hired_date, id);
    res.redirect("/employees");
  } catch(e){
    const emp = { ...req.body, id };
    res.render("employee_form", { employee: emp, error: "Could not update (email must be unique)." });
  }
});

app.post("/employees/:id/delete", requireAdmin, (req,res)=>{
  db.prepare("DELETE FROM employees WHERE id=?").run(Number(req.params.id));
  res.redirect("/employees");
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, ()=> console.log(`EMS running on http://localhost:${PORT}`));
