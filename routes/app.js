// ── API: talks to the backend ──────────────────────
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
    const text = await res.text();
    let data;

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text || "Server returned an unexpected response." };
    }

    return { ok: res.ok, data };
  }

  signupPatient(body)      { return this.send("POST", "/auth/signup/patient",    body); }
  signupDoctor(body)       { return this.send("POST", "/auth/signup/doctor",     body); }
  login(body)              { return this.send("POST", "/auth/login",             body); }
  resetPassword(body)      { return this.send("POST", "/auth/reset-password",    body); }
  book(body)               { return this.send("POST", "/booking/book",           body); }
  getQueue(appId)          { return this.send("GET",  `/booking/queue?appId=${appId}`); }
  cancelBooking(body)      { return this.send("POST", "/booking/cancel",         body); }
  pay(body)                { return this.send("POST", "/payment/pay",            body); }
  getDoctors()             { return this.send("GET",  "/queue/doctors"); }
  getClinics()             { return this.send("GET",  "/queue/clinics"); }
}

// ── Auth: manages login state ──────────────────────
class Auth {
  static save(token, user) {
    localStorage.setItem("token", token);
    localStorage.setItem("user",  JSON.stringify(user));
  }
  static clear() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("appId");
    localStorage.removeItem("bookedDoctor");
  }
  static isLoggedIn()  { return !!localStorage.getItem("token"); }
  static getUser()     { return JSON.parse(localStorage.getItem("user")); }
  static requireLogin() {
    if (!Auth.isLoggedIn()) {
      alert("Please log in first.");
      window.location.href = "LogIn.html";
    }
  }
}

// ── Home Page ──────────────────────────────────────
class HomePage {
  constructor() {
    const btn = document.getElementById("authBtn");
    if (!btn) return;

    btn.innerText = Auth.isLoggedIn() ? "Logout" : "Login";
    btn.onclick = () => {
      if (Auth.isLoggedIn()) {
        Auth.clear();
        window.location.reload();
      } else {
        window.location.href = "LogIn.html";
      }
    };
  }
}

// ── Login Page ─────────────────────────────────────
class LoginPage {
  constructor() {
    const form = document.querySelector("form");
    if (!form || !window.location.href.includes("LogIn")) return;

    // Get the active role button
    window.setActive = (btn) => {
      document.querySelectorAll(".user button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email    = document.querySelector("input[type='email']").value.trim();
      const password = document.querySelector("input[type='password']").value.trim();
      const activeBtn = document.querySelector(".user button.active");
      const role     = activeBtn ? activeBtn.innerText : "Patient";

      const { ok, data } = await new API().login({ email, password, role });
      if (ok) {
        Auth.save(data.token, data.user);
        window.location.href = "Home.html";
      } else {
        alert(data.message);
      }
    });
  }
}

// ── Sign Up Page ───────────────────────────────────
class SignUpPage {
  constructor() {
    const form = document.getElementById("form");
    if (!form) return;

    let role = "Patient";

    window.setActive = (btn) => {
      document.querySelectorAll(".user button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    };
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
      const submitBtn = form.querySelector("button[type='submit']");

      const firstName = document.getElementById("firstName").value.trim();
      const lastName  = document.getElementById("lastName").value.trim();
      const email     = document.getElementById("email").value.trim();
      const password  = document.getElementById("password").value.trim();
      const confirm   = document.getElementById("confirm").value.trim();

      if (password !== confirm) return alert("Passwords do not match!");

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Signing up...";
        }

        const api  = new API();
        let result;

        if (role === "Doctor") {
          const speciality = document.getElementById("specialization")?.value.trim();
          result = await api.signupDoctor({ firstName, lastName, email, password, speciality });
        } else {
          result = await api.signupPatient({ firstName, lastName, email, password });
        }

        alert(result.data.message || "Signup request finished.");
        if (result.ok) {
          window.location.href = "LogIn.html";
        }
      } catch (error) {
        alert("Signup failed. Check that the server is running and try again.");
        console.error("Signup error:", error);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Sign up";
        }
      }
    });
  }
}

// ── Forgot Page (new password) ─────────────────────
class ForgotPage {
  constructor() {
    if (!window.location.href.includes("forgot")) return;

    window.savePassword = async (e) => {
      e.preventDefault();
      const newPassword = document.getElementById("newPassword").value.trim();
      const confirm     = document.getElementById("confirmPassword").value.trim();
      const email       = document.getElementById("resetEmail").value.trim();
      if (newPassword !== confirm) return alert("Passwords do not match!");

      const role = "Patient";

      const { ok, data } = await new API().resetPassword({ email, newPassword, role });
      alert(data.message);
      if (ok) {
        window.location.href = "LogIn.html";
      }
    };
  }
}

// ── Booking Page ───────────────────────────────────
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

      const docId = localStorage.getItem("bookedDoctorId");
      if (!docId) return alert("No doctor selected. Please go back and choose a doctor.");

      const body = {
        patId: user.id,
        docId,
        date:  document.getElementById("date").value,
        time:  document.getElementById("time").value,
      };

      const { ok, data } = await new API().book(body);
      alert(data.message);
      if (ok) {
        localStorage.setItem("appId", data.appId);
        window.location.href = "Payment-Method.html";
      }
    });
  }
}

// ── Payment Pages ──────────────────────────────────
class PaymentPage {
  constructor() {
    const isVisa     = window.location.href.includes("Master-visa-meza");
    const isInstapay = window.location.href.includes("instapay");
    if (!isVisa && !isInstapay) return;

    Auth.requireLogin();

    const method = isVisa ? "Visa/Mastercard/Meeza" : "InstaPay";
    const form   = document.getElementById("paymentForm");
    const copyBtn = document.getElementById("copyBtn");

    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        const number = document.getElementById("payNumber")?.innerText;
        if (!number) return;
        navigator.clipboard.writeText(number);
        alert("Number copied: " + number);
      });
    }

    // Find the confirm/pay button
    const payBtn = document.getElementById("payBtn") ||
                   document.querySelector(".btn-confirm");

    if (payBtn) {
      payBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        if (form && !form.reportValidity()) return;

        const appId  = localStorage.getItem("appId");
        const amount = 300; // default amount, update as needed
        if (!appId) return alert("No booking found. Please book an appointment first.");

        const { ok, data } = await new API().pay({ appId, amount, method });
        alert(data.message);
        if (ok) window.location.href = "Tracking.html";
      });
    }
  }
}

// ── Tracking Page ──────────────────────────────────
class TrackingPage {
  constructor() {
    if (!window.location.href.includes("Tracking")) return;
    Auth.requireLogin();

    this.appId        = localStorage.getItem("appId");
    this.clinicName   = document.getElementById("clinicName");
    this.clinicLoc    = document.getElementById("clinicLocation");
    this.clinicStatus = document.getElementById("clinicStatus");
    this.avgTime      = document.getElementById("avgTime");
    this.yourNumber   = document.getElementById("yourNumber");
    this.nowServing   = document.getElementById("nowServing");
    this.waitTime     = document.getElementById("waitTime");
    this.patientsAhead = document.getElementById("patientsAhead");
    this.progressFill = document.getElementById("progressFill");
    this.alertBanner  = document.getElementById("alertBanner");

    this.fetchQueue();

    document.getElementById("refreshBtn")?.addEventListener("click", () => this.fetchQueue());
    document.getElementById("cancelBtn")?.addEventListener("click",  () => this.cancel());

    // Auto refresh every 30 seconds
    setInterval(() => this.fetchQueue(), 30000);
  }

  async fetchQueue() {
    if (!this.appId) {
      this.alertBanner.textContent = "⚠️ No booking found.";
      return;
    }

    const { ok, data } = await new API().getQueue(this.appId);
    if (ok) {
      this.updateUI(data);
    } else {
      this.alertBanner.textContent = "⚠️ Could not load queue info.";
    }
  }

  updateUI(data) {
    this.clinicName.textContent    = "🏥 " + data.clinicName;
    this.clinicLoc.textContent     = data.clinicLocation;
    this.clinicStatus.textContent  = data.status;
    this.avgTime.textContent       = data.avgTimePerPatient + " min";
    this.yourNumber.textContent    = data.yourNumber;
    this.nowServing.textContent    = data.nowServing;
    this.waitTime.textContent      = data.estimatedWait + " minutes";
    this.patientsAhead.textContent = data.patientsAhead + " patients ahead of you";

    const progress = (data.nowServing / data.yourNumber) * 100;
    this.progressFill.style.width = Math.min(progress, 100) + "%";

    if (data.estimatedWait <= 10) {
      this.alertBanner.textContent = "🚗 Leave now! You're almost next.";
    } else if (data.estimatedWait <= 20) {
      this.alertBanner.textContent = "⏳ Start getting ready to leave soon.";
    } else {
      this.alertBanner.textContent = "🛋️ You still have time. Relax at home!";
    }
  }

  async cancel() {
    if (!confirm("Are you sure you want to cancel your booking?")) return;

    const { ok, data } = await new API().cancelBooking({ appId: this.appId });
    alert(data.message);
    if (ok) {
      localStorage.removeItem("appId");
      window.location.href = "Home.html";
    }
  }
}

// ── Run everything ─────────────────────────────────
new HomePage();
new LoginPage();
new SignUpPage();
new ForgotPage();
new BookingPage();
new PaymentPage();
new TrackingPage();
