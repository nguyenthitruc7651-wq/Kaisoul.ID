/* =========================================================
   KAISOUL ID — app.js
   Client-side UI
   ========================================================= */

"use strict";

/* =========================================================
   ELEMENTS
   ========================================================= */

const pages = document.querySelectorAll(".page");

const menuBtn = document.getElementById("menuBtn");
const closeMenu = document.getElementById("closeMenu");
const sideMenu = document.getElementById("sideMenu");
const menuOverlay = document.getElementById("menuOverlay");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

const loginMessage = document.getElementById("loginMessage");
const registerMessage = document.getElementById("registerMessage");

/* =========================================================
   PAGE NAVIGATION
   ========================================================= */

function showPage(pageId) {
  const target = document.getElementById(pageId);

  if (!target) {
    return;
  }

  pages.forEach((page) => {
    page.classList.remove("active");
  });

  target.classList.add("active");

  closeSideMenu();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  history.replaceState(null, "", `#${pageId}`);
}


/* =========================================================
   PAGE BUTTONS
   ========================================================= */

document.querySelectorAll("[data-page]").forEach((button) => {
  button.addEventListener("click", () => {
    const pageId = button.dataset.page;

    showPage(pageId);
  });
});


/* =========================================================
   HASH NAVIGATION
   ========================================================= */

function loadPageFromHash() {
  const hash = window.location.hash.replace("#", "");

  if (hash && document.getElementById(hash)) {
    showPage(hash);
  } else {
    showPage("home");
  }
}

window.addEventListener("hashchange", loadPageFromHash);


/* =========================================================
   SIDE MENU
   ========================================================= */

function openSideMenu() {
  sideMenu.classList.add("active");
  menuOverlay.classList.add("active");

  document.body.style.overflow = "hidden";
}

function closeSideMenu() {
  sideMenu.classList.remove("active");
  menuOverlay.classList.remove("active");

  document.body.style.overflow = "";
}

menuBtn?.addEventListener("click", openSideMenu);

closeMenu?.addEventListener("click", closeSideMenu);

menuOverlay?.addEventListener("click", closeSideMenu);


/* =========================================================
   ESCAPE KEY
   ========================================================= */

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeSideMenu();
  }
});


/* =========================================================
   PASSWORD TOGGLE
   ========================================================= */

document.querySelectorAll(".password-toggle").forEach((button) => {

  button.addEventListener("click", () => {

    const targetId = button.dataset.target;
    const input = document.getElementById(targetId);

    if (!input) {
      return;
    }

    if (input.type === "password") {

      input.type = "text";
      button.textContent = "Ẩn";

    } else {

      input.type = "password";
      button.textContent = "Hiện";

    }

  });

});


/* =========================================================
   MESSAGE
   ========================================================= */

function showMessage(element, message, type = "error") {

  if (!element) {
    return;
  }

  element.textContent = message;

  element.classList.remove(
    "show",
    "error",
    "success"
  );

  element.classList.add(
    "show",
    type
  );
}


function clearMessage(element) {

  if (!element) {
    return;
  }

  element.textContent = "";

  element.classList.remove(
    "show",
    "error",
    "success"
  );

}


/* =========================================================
   BUTTON LOADING
   ========================================================= */

function setButtonLoading(button, loading) {

  if (!button) {
    return;
  }

  if (loading) {

    button.classList.add("loading");
    button.disabled = true;

  } else {

    button.classList.remove("loading");
    button.disabled = false;

  }

}


/* =========================================================
   USERNAME VALIDATION
   ========================================================= */

function validateUsername(username) {

  /*
   * Chỉ cho phép:
   * A-Z
   * a-z
   * 0-9
   * _
   */

  return /^[A-Za-z0-9_]{3,30}$/.test(username);
}


/* =========================================================
   EMAIL VALIDATION
   ========================================================= */

function validateEmail(email) {

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}


/* =========================================================
   REGISTER
   ========================================================= */

registerForm?.addEventListener("submit", async (event) => {

  event.preventDefault();

  clearMessage(registerMessage);

  const submitButton =
    registerForm.querySelector('button[type="submit"]');

  const displayName =
    document.getElementById("displayName")?.value.trim();

  const username =
    document.getElementById("username")?.value.trim();

  const email =
    document.getElementById("email")?.value.trim();

  const password =
    document.getElementById("registerPassword")?.value;

  const confirmPassword =
    document.getElementById("confirmPassword")?.value;


  /* -----------------------------------------
     VALIDATION
  ----------------------------------------- */

  if (!displayName) {

    showMessage(
      registerMessage,
      "Vui lòng nhập tên hiển thị."
    );

    return;
  }


  if (!validateUsername(username)) {

    showMessage(
      registerMessage,
      "Username phải có 3–30 ký tự và chỉ gồm chữ, số hoặc dấu gạch dưới."
    );

    return;
  }


  if (!validateEmail(email)) {

    showMessage(
      registerMessage,
      "Email không hợp lệ."
    );

    return;
  }


  if (password.length < 8) {

    showMessage(
      registerMessage,
      "Mật khẩu phải có ít nhất 8 ký tự."
    );

    return;
  }


  if (password !== confirmPassword) {

    showMessage(
      registerMessage,
      "Mật khẩu xác nhận không khớp."
    );

    return;
  }


  /* -----------------------------------------
     SEND TO SERVER
  ----------------------------------------- */

  setButtonLoading(submitButton, true);

  try {

    const response = await fetch("/api/auth/register", {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        displayName,
        username,
        email,
        password
      })

    });


    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }


    if (!response.ok) {

      throw new Error(
        data.message ||
        "Không thể tạo tài khoản."
      );

    }


    /* -----------------------------------------
       SUCCESS
    ----------------------------------------- */

    showMessage(
      registerMessage,
      data.message ||
      "Tạo tài khoản thành công.",
      "success"
    );


    registerForm.reset();


    /*
     * Server sẽ trả về KAISOUL ID
     * sau khi tạo tài khoản.
     */

    if (data.kaisoulId) {

      setTimeout(() => {

        alert(
          `Tài khoản đã được tạo!\n\nKAISOUL ID của bạn:\n${data.kaisoulId}`
        );

        showPage("login");

      }, 400);

    } else {

      setTimeout(() => {
        showPage("login");
      }, 1000);

    }


  } catch (error) {

    console.error(
      "KAISOUL ID register error:",
      error
    );

    showMessage(
      registerMessage,
      error.message ||
      "Có lỗi xảy ra. Vui lòng thử lại."
    );

  } finally {

    setButtonLoading(
      submitButton,
      false
    );

  }

});


/* =========================================================
   LOGIN
   ========================================================= */

loginForm?.addEventListener("submit", async (event) => {

  event.preventDefault();

  clearMessage(loginMessage);

  const submitButton =
    loginForm.querySelector('button[type="submit"]');

  const identity =
    document.getElementById("loginIdentity")?.value.trim();

  const password =
    document.getElementById("loginPassword")?.value;


  /* -----------------------------------------
     VALIDATION
  ----------------------------------------- */

  if (!identity) {

    showMessage(
      loginMessage,
      "Vui lòng nhập KAISOUL ID hoặc Email."
    );

    return;
  }


  if (!password) {

    showMessage(
      loginMessage,
      "Vui lòng nhập mật khẩu."
    );

    return;
  }


  /* -----------------------------------------
     SEND TO SERVER
  ----------------------------------------- */

  setButtonLoading(
    submitButton,
    true
  );


  try {

    const response = await fetch(
      "/api/auth/login",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        credentials: "include",

        body: JSON.stringify({
          identity,
          password
        })
      }
    );


    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }


    if (!response.ok) {

      throw new Error(
        data.message ||
        "KAISOUL ID hoặc mật khẩu không chính xác."
      );

    }


    /* -----------------------------------------
       LOGIN SUCCESS
    ----------------------------------------- */

    showMessage(
      loginMessage,
      data.message ||
      "Đăng nhập thành công.",
      "success"
    );


    /*
     * Sau này server sẽ tạo session
     * bằng HttpOnly cookie.
     */

    setTimeout(() => {

      if (data.redirect) {

        window.location.href =
          data.redirect;

      } else {

        window.location.href =
          "/dashboard";

      }

    }, 500);


  } catch (error) {

    console.error(
      "KAISOUL ID login error:",
      error
    );

    showMessage(
      loginMessage,
      error.message ||
      "Không thể đăng nhập."
    );

  } finally {

    setButtonLoading(
      submitButton,
      false
    );

  }

});


/* =========================================================
   FORGOT PASSWORD
   ========================================================= */

document
  .querySelector(".forgot-btn")
  ?.addEventListener("click", () => {

    alert(
      "Tính năng khôi phục mật khẩu sẽ được triển khai ở bước bảo mật."
    );

  });


/* =========================================================
   NORMALIZE USERNAME
   ========================================================= */

const usernameInput =
  document.getElementById("username");

usernameInput?.addEventListener("input", () => {

  usernameInput.value =
    usernameInput.value
      .replace(/[^A-Za-z0-9_]/g, "")
      .toLowerCase();

});


/* =========================================================
   INITIALIZE
   ========================================================= */

loadPageFromHash();

console.log(
  "KAISOUL ID client initialized."
);
