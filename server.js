"use strict";

require("dotenv").config();

const express = require("express");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const Database = require("better-sqlite3");

/* =========================================================
   CONFIG
========================================================= */

const app = express();

const PORT = Number(process.env.PORT) || 3000;

const SESSION_SECRET =
  process.env.SESSION_SECRET;

if (!SESSION_SECRET) {
  console.error(
    "ERROR: SESSION_SECRET chưa được cấu hình trong .env"
  );

  process.exit(1);
}


/* =========================================================
   DATABASE
========================================================= */

const db = new Database(
  path.join(__dirname, "kaisoul-id.db")
);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");


/* =========================================================
   DATABASE TABLES
========================================================= */

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    kaisoul_id TEXT NOT NULL UNIQUE,

    display_name TEXT NOT NULL,

    username TEXT NOT NULL UNIQUE,

    email TEXT NOT NULL UNIQUE,

    password_hash TEXT NOT NULL,

    avatar TEXT,

    status TEXT NOT NULL DEFAULT 'active',

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);


/* =========================================================
   EXPRESS
========================================================= */

app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

app.use(
  express.json({
    limit: "20kb"
  })
);

app.use(
  express.urlencoded({
    extended: false,
    limit: "20kb"
  })
);


/* =========================================================
   RATE LIMIT
========================================================= */

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  limit: 20,

  standardHeaders: true,

  legacyHeaders: false,

  message: {
    message:
      "Quá nhiều yêu cầu xác thực. Vui lòng thử lại sau."
  }
});

app.use(
  "/api/auth",
  authLimiter
);


/* =========================================================
   STATIC FILES
   Không cần thư mục public.
========================================================= */

app.use(
  express.static(__dirname, {
    index: false
  })
);


/* =========================================================
   KAISOUL ID GENERATOR
========================================================= */

/*
  KAISOUL ID:

  XXX-XXXXXX

  Ví dụ:

  A7F-29X4KQ
  8QM-X71P2A
  Z4B-9K2M7X

  Chỉ dùng:
  A-Z
  0-9

  Không dùng các ký tự dễ nhầm:
  O / 0
  I / 1
*/

const ID_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";


function randomCharacters(length) {

  const bytes =
    crypto.randomBytes(length);

  let result = "";

  for (let i = 0; i < length; i++) {

    result +=
      ID_ALPHABET[
        bytes[i] % ID_ALPHABET.length
      ];

  }

  return result;
}


function generateKaisoulId() {

  while (true) {

    const kaisoulId =
      `${randomCharacters(3)}-${randomCharacters(6)}`;

    const existing =
      db.prepare(`
        SELECT id
        FROM users
        WHERE kaisoul_id = ?
        LIMIT 1
      `).get(kaisoulId);

    if (!existing) {
      return kaisoulId;
    }

  }
}


/* =========================================================
   VALIDATION
========================================================= */

function normalizeUsername(username) {

  return String(username || "")
    .trim()
    .toLowerCase();

}


function normalizeEmail(email) {

  return String(email || "")
    .trim()
    .toLowerCase();

}


function validateUsername(username) {

  return /^[a-z0-9_]{3,30}$/.test(
    username
  );

}


function validateEmail(email) {

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );

}


function validateDisplayName(name) {

  return (
    typeof name === "string" &&
    name.trim().length >= 1 &&
    name.trim().length <= 50
  );

}


/* =========================================================
   HEALTH CHECK
========================================================= */

app.get("/api/health", (req, res) => {

  res.json({
    ok: true,
    service: "KAISOUL ID",
    status: "online"
  });

});


/* =========================================================
   REGISTER
========================================================= */

app.post(
  "/api/auth/register",
  async (req, res) => {

    try {

      const displayName =
        String(req.body.displayName || "").trim();

      const username =
        normalizeUsername(req.body.username);

      const email =
        normalizeEmail(req.body.email);

      const password =
        String(req.body.password || "");


      /* -----------------------------------------
         VALIDATION
      ----------------------------------------- */

      if (!validateDisplayName(displayName)) {

        return res.status(400).json({
          message:
            "Tên hiển thị phải có từ 1 đến 50 ký tự."
        });

      }


      if (!validateUsername(username)) {

        return res.status(400).json({
          message:
            "Username phải có 3–30 ký tự và chỉ gồm chữ, số hoặc dấu gạch dưới."
        });

      }


      if (!validateEmail(email)) {

        return res.status(400).json({
          message:
            "Email không hợp lệ."
        });

      }


      if (password.length < 8) {

        return res.status(400).json({
          message:
            "Mật khẩu phải có ít nhất 8 ký tự."
        });

      }


      /* -----------------------------------------
         CHECK DUPLICATE
      ----------------------------------------- */

      const existing =
        db.prepare(`
          SELECT id
          FROM users
          WHERE username = ?
             OR email = ?
          LIMIT 1
        `).get(
          username,
          email
        );


      if (existing) {

        return res.status(409).json({
          message:
            "Username hoặc email đã được sử dụng."
        });

      }


      /* -----------------------------------------
         PASSWORD HASH
      ----------------------------------------- */

      const passwordHash =
        await bcrypt.hash(
          password,
          12
        );


      /* -----------------------------------------
         GENERATE KAISOUL ID
      ----------------------------------------- */

      const kaisoulId =
        generateKaisoulId();


      /* -----------------------------------------
         INSERT USER
      ----------------------------------------- */

      const insertUser =
        db.prepare(`
          INSERT INTO users (
            kaisoul_id,
            display_name,
            username,
            email,
            password_hash
          )
          VALUES (?, ?, ?, ?, ?)
        `);


      const result =
        insertUser.run(
          kaisoulId,
          displayName,
          username,
          email,
          passwordHash
        );


      return res.status(201).json({

        success: true,

        message:
          "Tạo tài khoản KAISOUL ID thành công.",

        kaisoulId,

        userId:
          result.lastInsertRowid

      });


    } catch (error) {

      console.error(
        "REGISTER ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Không thể tạo tài khoản."
      });

    }

  }
);


/* =========================================================
   LOGIN
========================================================= */

app.post(
  "/api/auth/login",
  async (req, res) => {

    try {

      const identity =
        String(req.body.identity || "").trim();

      const password =
        String(req.body.password || "");


      if (!identity || !password) {

        return res.status(400).json({
          message:
            "Vui lòng nhập đầy đủ thông tin đăng nhập."
        });

      }


      const normalizedIdentity =
        identity.toLowerCase();


      const user =
        db.prepare(`
          SELECT
            id,
            kaisoul_id,
            display_name,
            username,
            email,
            password_hash,
            status
          FROM users
          WHERE
            lower(kaisoul_id) = ?
            OR lower(email) = ?
            OR lower(username) = ?
          LIMIT 1
        `).get(
          normalizedIdentity,
          normalizedIdentity,
          normalizedIdentity
        );


      /*
        Không tiết lộ tài khoản có tồn tại hay không.
      */

      if (!user) {

        return res.status(401).json({
          message:
            "KAISOUL ID, username, email hoặc mật khẩu không chính xác."
        });

      }


      if (user.status !== "active") {

        return res.status(403).json({
          message:
            "Tài khoản hiện không hoạt động."
        });

      }


      const passwordCorrect =
        await bcrypt.compare(
          password,
          user.password_hash
        );


      if (!passwordCorrect) {

        return res.status(401).json({
          message:
            "KAISOUL ID, username, email hoặc mật khẩu không chính xác."
        });

      }


      /*
        Tạm thời trả về thông tin tài khoản.

        SESSION COOKIE sẽ được triển khai
        ở bước session/authentication tiếp theo.
      */

      return res.json({

        success: true,

        message:
          "Đăng nhập thành công.",

        user: {

          id: user.id,

          kaisoulId:
            user.kaisoul_id,

          displayName:
            user.display_name,

          username:
            user.username,

          email:
            user.email

        }

      });


    } catch (error) {

      console.error(
        "LOGIN ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Không thể đăng nhập."
      });

    }

  }
);


/* =========================================================
   LOGOUT
========================================================= */

app.post(
  "/api/auth/logout",
  (req, res) => {

    /*
      Session thật sẽ được xử lý
      khi thêm session system.
    */

    return res.json({
      success: true,
      message:
        "Đã đăng xuất."
    });

  }
);


/* =========================================================
   CURRENT USER
========================================================= */

app.get(
  "/api/account",
  (req, res) => {

    /*
      Endpoint này sẽ được hoàn thiện
      sau khi triển khai session.
    */

    return res.status(401).json({
      message:
        "Chưa đăng nhập."
    });

  }
);


/* =========================================================
   FRONTEND
========================================================= */

app.get(
  "*",
  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        "index.html"
      )
    );

  }
);


/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(
  (err, req, res, next) => {

    console.error(
      "SERVER ERROR:",
      err
    );

    res.status(500).json({
      message:
        "Lỗi máy chủ."
    });

  }
);


/* =========================================================
   START SERVER
========================================================= */

app.listen(
  PORT,
  () => {

    console.log(
      "===================================="
    );

    console.log(
      "       KAISOUL ID SERVER"
    );

    console.log(
      "===================================="
    );

    console.log(
      `Server: http://localhost:${PORT}`
    );

    console.log(
      "Database: kaisoul-id.db"
    );

    console.log(
      "Status: ONLINE"
    );

    console.log(
      "===================================="
    );

  }
);
