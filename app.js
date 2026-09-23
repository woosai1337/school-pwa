// === АДРЕС API ===
const API_URL = "https://schoolbot-v2.onrender.com";

// === ДНИ ===
const DAYS = { 1: "Пн", 2: "Вт", 3: "Ср", 4: "Чт", 5: "Пт" };
const DAYS_FULL = { 1: "Понедельник", 2: "Вторник", 3: "Среда",
                    4: "Четверг", 5: "Пятница" };

let currentDay = new Date().getDay() || 1;
if (currentDay > 5) currentDay = 1;

// === ПОЛЬЗОВАТЕЛЬ ===
function getUser() {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
}

function saveUser(user) {
    localStorage.setItem("user", JSON.stringify(user));
}

function logout() {
    localStorage.removeItem("user");
    renderLogin();
}

// === API-ЗАПРОСЫ ===
async function api(path) {
    try {
        const resp = await fetch(API_URL + path);
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error || "Ошибка " + resp.status);
        }
        return await resp.json();
    } catch (e) {
        console.error("API error:", e);
        throw e;
    }
}

// === РОУТИНГ ===
const pages = {
    schedule: renderSchedule,
    substitutions: renderSubstitutions,
    bells: renderBells,
    events: renderEvents,
    announcements: renderAnnouncements,
    profile: renderProfile,
};

function navigate(page) {
    document.getElementById("menu").classList.add("hidden");

    // Требуем логин для всех страниц, кроме профиля-логина
    const user = getUser();
    if (!user && page !== "profile") {
        renderLogin();
        return;
    }

    const titles = {
        schedule: "Расписание",
        substitutions: "Замены",
        bells: "Звонки",
        events: "Мероприятия",
        announcements: "Объявления",
        profile: "Профиль",
    };
    document.getElementById("title").textContent = titles[page] || "";
    pages[page]?.();
}

// === ЭКРАН ЛОГИНА ===
function renderLogin() {
    document.getElementById("title").textContent = "Вход";
    document.getElementById("content").innerHTML = `
        <div class="card">
            <h2>👋 Добро пожаловать!</h2>
            <p style="color:#666;margin:8px 0 16px;">
                Войди любым удобным способом:
            </p>

            <div style="font-weight:600;margin-bottom:8px;">Способ 1 — по @username</div>
            <input id="loginUsername" type="text" placeholder="@username"
                style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:15px;">
            <button id="loginBtnTg"
                style="width:100%;margin-top:8px;padding:14px;background:#4F81BD;color:#fff;
                border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;">
                Войти по username
            </button>

            <div style="text-align:center;color:#999;margin:16px 0;">или</div>

            <div style="font-weight:600;margin-bottom:8px;">Способ 2 — по ID</div>
            <p style="color:#666;font-size:13px;margin:0 0 8px;">
                Нет username? В боте напиши <code>/myid</code> или нажми «🆔 Мой ID для входа» — покажет число.
            </p>
            <input id="loginId" type="text" placeholder="Например: 801844727" inputmode="numeric"
                style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:15px;">
            <button id="loginBtnId"
                style="width:100%;margin-top:8px;padding:14px;background:#f4f6fa;color:#4F81BD;
                border:1px solid #4F81BD;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;">
                Войти по ID
            </button>

            <div id="loginError" style="color:#c0392b;margin-top:12px;font-size:14px;"></div>
        </div>
    `;

    const errEl = document.getElementById("loginError");

    document.getElementById("loginBtnTg").onclick = async () => {
        const username = document.getElementById("loginUsername").value.trim();
        if (!username) {
            errEl.textContent = "Введи username";
            return;
        }
        errEl.textContent = "Проверяю…";
        try {
            const user = await api("/api/me?username=" + encodeURIComponent(username));
            saveUser(user);
            navigate("schedule");
        } catch (e) {
            errEl.textContent = e.message || "Не найден";
        }
    };

    document.getElementById("loginBtnId").onclick = async () => {
        const userId = document.getElementById("loginId").value.trim();
        if (!userId) {
            errEl.textContent = "Введи ID";
            return;
        }
        errEl.textContent = "Проверяю…";
        try {
            const user = await api("/api/me-by-id?user_id=" + encodeURIComponent(userId));
            saveUser(user);
            navigate("schedule");
        } catch (e) {
            errEl.textContent = e.message || "Не найден";
        }
    };

    document.getElementById("loginUsername").addEventListener("keypress", (e) => {
        if (e.key === "Enter") document.getElementById("loginBtnTg").click();
    });
    document.getElementById("loginId").addEventListener("keypress", (e) => {
        if (e.key === "Enter") document.getElementById("loginBtnId").click();
    });
}

// === РАСПИСАНИЕ ===
async function renderSchedule() {
    const user = getUser();
    if (!user) return renderLogin();

    const content = document.getElementById("content");
    content.innerHTML = `
        <div class="day-nav">
            ${[1,2,3,4,5].map(d =>
                `<button class="${d === currentDay ? 'active' : ''}" data-day="${d}">${DAYS[d]}</button>`
            ).join("")}
        </div>
        <div id="schedule-body"><div class="card empty">Загрузка…</div></div>
    `;

    content.querySelectorAll(".day-nav button").forEach(b => {
        b.onclick = () => {
            currentDay = parseInt(b.dataset.day);
            renderSchedule();
        };
    });

    const body = document.getElementById("schedule-body");

    try {
        const [sch, subs] = await Promise.all([
            api(`/api/schedule?class=${encodeURIComponent(user.class)}&day=${currentDay}`),
            api(`/api/substitutions?class=${encodeURIComponent(user.class)}`),
        ]);

        const lessons = sch.lessons || [];
        const subsToday = (subs.substitutions || []).filter(s => s.day === currentDay);

        const subMap = {};
        subsToday.forEach(s => subMap[s.lesson] = s);

        if (!lessons.length) {
            body.innerHTML = `<div class="card empty">Уроков нет</div>`;
            return;
        }

        body.innerHTML = `<div class="card">
            <h2>${DAYS_FULL[currentDay]}</h2>
            ${lessons.map((l) => {
                const sub = subMap[l.lesson];
                if (sub) {
                    const subjPart = sub.old_subject !== sub.new_subject
                        ? `<s>${sub.old_subject || l.subject}</s> → <b>${sub.new_subject || l.subject}</b>`
                        : `<b>${sub.new_subject || l.subject}</b>`;
                    const cabPart = sub.old_cabinet !== sub.new_cabinet
                        ? `🚪 <s>${sub.old_cabinet || l.cabinet || '—'}</s> → <b>${sub.new_cabinet || l.cabinet || '—'}</b>`
                        : (sub.new_cabinet || l.cabinet ? `🚪 ${sub.new_cabinet || l.cabinet}` : "");
                    return `<div class="lesson">
                        <div class="lesson-num">${l.lesson}</div>
                        <div class="lesson-body">
                            <div class="lesson-subject substitution">⚠️ ${subjPart}</div>
                            <div class="lesson-cabinet">${cabPart}</div>
                        </div>
                    </div>`;
                }
                return `<div class="lesson">
                    <div class="lesson-num">${l.lesson}</div>
                    <div class="lesson-body">
                        <div class="lesson-subject">${l.subject}</div>
                        <div class="lesson-cabinet">${l.cabinet ? '🚪 ' + l.cabinet : ''}</div>
                    </div>
                </div>`;
            }).join("")}
        </div>`;
    } catch (e) {
        body.innerHTML = `<div class="card empty">Ошибка: ${e.message}</div>`;
    }
}

// === ЗАМЕНЫ ===
async function renderSubstitutions() {
    const user = getUser();
    if (!user) return renderLogin();

    const content = document.getElementById("content");
    content.innerHTML = `<div class="card empty">Загрузка…</div>`;

    try {
        const data = await api(`/api/substitutions?class=${encodeURIComponent(user.class)}`);
        const subs = data.substitutions || [];

        if (!subs.length) {
            content.innerHTML = `<div class="card empty">Замен нет</div>`;
            return;
        }

        content.innerHTML = `<div class="card">
            <h2>${data.date}</h2>
            ${subs.map(s => {
                const subjPart = s.old_subject !== s.new_subject
                    ? `<s>${s.old_subject}</s> → <b>${s.new_subject}</b>`
                    : `<b>${s.new_subject}</b>`;
                const cabPart = s.old_cabinet !== s.new_cabinet
                    ? `🚪 <s>${s.old_cabinet || '—'}</s> → <b>${s.new_cabinet || '—'}</b>`
                    : (s.new_cabinet ? `🚪 ${s.new_cabinet}` : "");
                return `<div class="lesson">
                    <div class="lesson-num">${s.lesson}</div>
                    <div class="lesson-body">
                        <div class="lesson-subject substitution">⚠️ ${subjPart}</div>
                        <div class="lesson-cabinet">${cabPart}</div>
                    </div>
                </div>`;
            }).join("")}
        </div>`;
    } catch (e) {
        content.innerHTML = `<div class="card empty">Ошибка: ${e.message}</div>`;
    }
}

// === ЗВОНКИ ===
async function renderBells() {
    const content = document.getElementById("content");
    content.innerHTML = `<div class="card empty">Загрузка…</div>`;

    try {
        const data = await api("/api/bells");
        content.innerHTML = `<div class="card">
            <h2>Расписание звонков</h2>
            ${data.bells.map(b => `<div class="lesson">
                <div class="lesson-num">${b.lesson}</div>
                <div class="lesson-body"><div class="lesson-subject">${b.start} — ${b.end}</div></div>
            </div>`).join("")}
        </div>`;
    } catch (e) {
        content.innerHTML = `<div class="card empty">Ошибка: ${e.message}</div>`;
    }
}

// === МЕРОПРИЯТИЯ ===
async function renderEvents() {
    const content = document.getElementById("content");
    content.innerHTML = `<div class="card empty">Загрузка…</div>`;

    try {
        const data = await api("/api/events");
        const events = data.events || [];

        if (!events.length) {
            content.innerHTML = `<div class="card empty">Пока нет мероприятий</div>`;
            return;
        }

        content.innerHTML = events.map(e => `<div class="card">
            <h2>${e.title}</h2>
            ${e.date ? `<div class="lesson-cabinet">📅 ${e.date}${e.time ? ' в ' + e.time : ''}</div>` : ""}
            ${e.place ? `<div class="lesson-cabinet">📍 ${e.place}</div>` : ""}
            ${e.description ? `<div style="margin-top:8px;">${e.description}</div>` : ""}
        </div>`).join("");
    } catch (e) {
        content.innerHTML = `<div class="card empty">Ошибка: ${e.message}</div>`;
    }
}

// === ОБЪЯВЛЕНИЯ ===
async function renderAnnouncements() {
    const content = document.getElementById("content");
    content.innerHTML = `<div class="card empty">Загрузка…</div>`;

    try {
        const data = await api("/api/announcements");
        const list = data.announcements || [];

        if (!list.length) {
            content.innerHTML = `<div class="card empty">Пока нет объявлений</div>`;
            return;
        }

        content.innerHTML = list.map(a => `<div class="card">
            <h2>${a.important ? '❗ ' : '📌 '}${a.title}</h2>
            <div style="margin-top:8px;">${a.text}</div>
        </div>`).join("");
    } catch (e) {
        content.innerHTML = `<div class="card empty">Ошибка: ${e.message}</div>`;
    }
}

// === ПРОФИЛЬ ===
async function renderProfile() {
    const user = getUser();

    if (!user) {
        renderLogin();
        return;
    }

    const roleText = {
        student: "🎓 Ученик",
        teacher: "👨‍🏫 Учитель",
        admin: "👑 Админ",
    }[user.role] || "🎓 Ученик";

    document.getElementById("content").innerHTML = `<div class="card">
        <h2>Профиль</h2>
        <div class="lesson">
            <div class="lesson-num">👤</div>
            <div class="lesson-body">
                <div class="lesson-subject">${user.name}</div>
                <div class="lesson-cabinet">${user.class ? '📚 ' + user.class : ''}</div>
            </div>
        </div>
        <div class="lesson">
            <div class="lesson-num">🎭</div>
            <div class="lesson-body">
                <div class="lesson-subject">${roleText}</div>
                ${user.position ? `<div class="lesson-cabinet">${user.position}</div>` : ""}
            </div>
        </div>
        ${user.username ? `<div class="lesson">
            <div class="lesson-num">🔗</div>
            <div class="lesson-body"><div class="lesson-subject">@${user.username}</div></div>
        </div>` : ""}
        <button id="logoutBtn"
            style="width:100%;margin-top:16px;padding:12px;background:#f4f6fa;color:#c0392b;
            border:1px solid #ddd;border-radius:8px;font-size:14px;cursor:pointer;">
            🚪 Выйти
        </button>
    </div>`;

    document.getElementById("logoutBtn").onclick = logout;
}

// === МЕНЮ ===
document.getElementById("menuBtn").onclick = () => {
    document.getElementById("menu").classList.toggle("hidden");
};

document.querySelectorAll(".menu a").forEach(a => {
    a.onclick = (e) => {
        e.preventDefault();
        navigate(a.dataset.page);
    };
});

// === SERVICE WORKER ===
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(err => {
        console.warn("SW не зарегистрирован:", err);
    });
}

// === ОНЛАЙН/ОФЛАЙН ===
window.addEventListener("online", () => {
    document.getElementById("offline-banner").classList.add("hidden");
});
window.addEventListener("offline", () => {
    document.getElementById("offline-banner").classList.remove("hidden");
});
if (!navigator.onLine) {
    document.getElementById("offline-banner").classList.remove("hidden");
}

// === СТАРТ ===
const user = getUser();
if (user) {
    navigate("schedule");
} else {
    renderLogin();
}
