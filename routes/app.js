class API {
  constructor() {
    this.base = "http://localhost:3000/api";
  }

  async send(method, path, body) {
    const options = {
      method,
      headers: { "Content-Type": "application/json" },
    };

    const token = localStorage.getItem("token");
    if (token) options.headers["Authorization"] = token;
    if (body)  options.body = JSON.stringify(body);

    const res  = await fetch(this.base + path, options);
    const data = await res.json();
    return { ok: res.ok, data };
  }

  signup(body)         { return this.send("POST", "/auth/signup",          body); }
  login(body)          { return this.send("POST", "/auth/login",           body); }
  forgotPassword(body) { return this.send("POST", "/auth/forgot-password", body); }
  resetPassword(body)  { return this.send("POST", "/auth/reset-password",  body); }
  verifyEmail(token)   { return this.send("GET",  `/auth/verify-email?token=${token}`); }
  book(body)           { return this.send("POST", "/booking/book",         body); }
}

class Auth {
  static save(token, user) {
    localStorage.setItem("token", token);
    localStorage.setItem("user",  JSON.stringify(user));
  }
  static clear() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }
  static isLoggedIn() {
    return !!localStorage.getItem("token");
  }
  static getUser() {
    return JSON.parse(localStorage.getItem("user"));
  }
  static requireLogin() {
    if (!Auth.isLoggedIn()) {
      alert("Please log in first.");
      window.location.href = "LogIn.html";
    }
  }
}

class HomePage {
  constructor() {
    const btn = document.getElementById("authBtn");
    if (!btn) return;

    btn.innerText = Auth.isLoggedIn() ? "Logout" : "Login";

    btn.addEventListener("click", () => {
      if (Auth.isLoggedIn()) {
        Auth.clear();
        window.location.reload();
      } else {
        window.location.href = "LogIn.html";
      }
    });
  }
}

class LoginPage {
  constructor() {
    const form = document.querySelector("form");
    if (!form) return;
    if (!window.location.href.includes("LogIn")) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email    = document.querySelector("input[type='email']").value.trim();
      const password = document.querySelector("input[type='password']").value.trim();

      const { ok, data } = await new API().login({ email, password });

      if (ok) {
        Auth.save(data.token, data.user);
        window.location.href = "Home.html";
      } else {
        alert(data.message);
      }
    });
  }
}

class SignUpPage {
  constructor() {
    const form = document.getElementById("form");
    if (!form) return;

    let role = "Patient";

    window.showPatient = () => {
      role = "Patient";
      document.getElementById("extra").innerHTML = "";
    };

    window.showDoctor = () => {
      role = "Doctor";
      document.getElementById("extra").innerHTML =
        '<input id="specialization" type="text" placeholder="Enter your specialization" required style="width:100%;padding:18px 25px;border:none;border-radius:50px;background:#fff;font-size:15px;outline:none;">';
    };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const firstName = document.getElementById("firstName").value.trim();
      const lastName  = document.getElementById("lastName").value.trim();
      const email     = document.getElementById("email").value.trim();
      const password  = document.getElementById("password").value.trim();
      const confirm   = document.getElementById("confirm").value.trim();

      if (password !== confirm) return alert("Passwords do not match!");

      const body = { firstName, lastName, email, password, role };
      if (role === "Doctor") {
        body.specialization = document.getElementById("specialization")?.value.trim();
      }

      const { ok, data } = await new API().signup(body);
      alert(data.message);
      if (ok) window.location.href = "email-verifiy.html";
    });
  }
}

class VerifyPage {
  constructor() {
    if (!window.location.href.includes("email-verifiy")) return;

    const token = new URLSearchParams(window.location.search).get("token");

    window.goToVerification = async () => {
      if (!token) return alert("No token found. Please use the link from your email.");
      const { ok, data } = await new API().verifyEmail(token);
      alert(data.message);
      if (ok) window.location.href = "LogIn.html";
    };

    if (token) window.goToVerification();
  }
}

class ForgotPage {
  constructor() {
    if (!window.location.href.includes("forgot")) return;

    const token = new URLSearchParams(window.location.search).get("token");

    window.sendReset = async () => {
      const email = document.getElementById("email")?.value.trim();
      if (!email) return alert("Please enter your email.");
      const { data } = await new API().forgotPassword({ email });
      alert(data.message);
    };

    window.savePassword = async (e) => {
      e.preventDefault();
      if (!token) return alert("Invalid reset link.");
      const newPassword = document.getElementById("newPassword").value.trim();
      const confirm     = document.getElementById("confirmPassword").value.trim();
      if (newPassword !== confirm) return alert("Passwords do not match!");
      const { ok, data } = await new API().resetPassword({ token, newPassword });
      alert(data.message);
      if (ok) window.location.href = "LogIn.html";
    };
  }
}

class BookingPage {
  constructor() {
    const form = document.getElementById("bookingForm");
    if (!form) return;

    Auth.requireLogin();

    const user       = Auth.getUser();
    const emailInput = document.getElementById("email");
    if (user && emailInput) emailInput.value = user.email;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const body = {
        firstName: document.getElementById("firstName").value.trim(),
        lastName:  document.getElementById("lastName").value.trim(),
        phone:     document.getElementById("phone").value.trim(),
        email:     document.getElementById("email").value.trim(),
        date:      document.getElementById("date").value,
        time:      document.getElementById("time").value,
      };

      const { ok, data } = await new API().book(body);
      alert(data.message);
      if (ok) form.reset();
    });
  }
}

new HomePage();
new LoginPage();
new SignUpPage();
new VerifyPage();
new ForgotPage();
new BookingPage();