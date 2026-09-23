// === МОК-ДАННЫЕ (позже заменим на API) ===
const MOCK_SCHEDULE = {
    "5А": {
        1: [
            { subject: "Белорусский язык", cabinet: "1-26" },
            { subject: "Математика", cabinet: "2-14" },
            { subject: "Физкультура", cabinet: "спортзал" },
            { subject: "Английский язык", cabinet: "3-5" },
            { subject: "История", cabinet: "1-10" },
        ],
        2: [
            { subject: "Русский язык", cabinet: "1-26" },
            { subject: "Математика", cabinet: "2-14" },
            { subject: "Биология", cabinet: "4-2" },
        ],
    },
};

const MOCK_SUBSTITUTIONS = {
    "5А": {
        1: [
            { lesson: 2, old_subject: "Математика", new_subject: "Физика",
              old_cabinet: "2-14", new_cabinet: "3-1" },
        ],
    },
};

const DAYS = { 1: "Пн", 2: "Вт", 3: "Ср", 4: "Чт", 5: "Пт" };
const DAYS_FULL = { 1: "Понедельник", 2: "Вторник", 3: "Среда",
                    4: "Четверг", 5: "Пятница" };

let currentDay = new Date().getDay() || 1;
if (currentDay > 5) currentDay = 1;

const userClass = "5А"; // позже — из профиля

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

// === РАСПИСАНИЕ ===
async function renderSchedule() {
    const content = document.getElementById("content");
    content.innerHTML = `
        <div class="day-nav">
            ${[1,2,3,4,5].map(d =>
                `<button class="${d === currentDay ? 'active' : ''}" data-day="${d}">${DAYS[d]}</button>`
            ).join("")}
        </div>
        <div id="schedule-body"></div>
    `;

    content.querySelectorAll(".day-nav button").forEach(b => {
        b.onclick = () => {
            currentDay = parseInt(b.dataset.day);
            renderSchedule();
        };
    });

    const lessons = MOCK_SCHEDULE[userClass]?.[currentDay] || [];
    const subs = MOCK_SUBSTITUTIONS[userClass]?.[currentDay] || [];

    const subMap = {};
    subs.forEach(s => subMap[s.lesson] = s);

    const body = document.getElementById("schedule-body");

    if (!lessons.length) {
        body.innerHTML = `<div class="card empty">Уроков нет</div>`;
        return;
    }

    body.innerHTML = `<div class="card">
        <h2>${DAYS_FULL[currentDay]}</h2>
        ${lessons.map((l, i) => {
            const num = i + 1;
            const sub = subMap[num];
            if (sub) {
                const subjPart = sub.old_subject !== sub.new_subject
                    ? `<s>${sub.old_subject}</s> → <b>${sub.new_subject}</b>`
                    : `<b>${sub.new_subject}</b>`;
                const cabPart = sub.old_cabinet !== sub.new_cabinet
                    ? `🚪 <s>${sub.old_cabinet || '—'}</s> → <b>${sub.new_cabinet || '—'}</b>`
                    : (sub.new_cabinet ? `🚪 ${sub.new_cabinet}` : "");
                return `<div class="lesson">
                    <div class="lesson-num">${num}</div>
                    <div class="lesson-body">
                        <div class="lesson-subject substitution">⚠️ ${subjPart}</div>
                        <div class="lesson-cabinet">${cabPart}</div>
                    </div>
                </div>`;
            }
            return `<div class="lesson">
                <div class="lesson-num">${num}</div>
                <div class="lesson-body">
                    <div class="lesson-subject">${l.subject}</div>
                    <div class="lesson-cabinet">${l.cabinet ? '🚪 ' + l.cabinet : ''}</div>
                </div>
            </div>`;
        }).join("")}
    </div>`;
}

// === ЗАМЕНЫ ===
async function renderSubstitutions() {
    const content = document.getElementById("content");
    const subs = MOCK_SUBSTITUTIONS[userClass]?.[currentDay] || [];

    if (!subs.length) {
        content.innerHTML = `<div class="card empty">Замен нет</div>`;
        return;
    }

    content.innerHTML = `<div class="card">
        <h2>${DAYS_FULL[currentDay]}</h2>
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
}

// === ЗВОНКИ ===
async function renderBells() {
    const bells = [
        ["08:00", "08:40"], ["08:55", "09:40"], ["09:55", "10:40"],
        ["10:55", "11:40"], ["11:55", "12:40"], ["12:55", "13:40"],
        ["13:50", "14:35"], ["14:45", "15:30"],
    ];
    document.getElementById("content").innerHTML = `<div class="card">
        <h2>Расписание звонков</h2>
        ${bells.map((b, i) => `<div class="lesson">
            <div class="lesson-num">${i+1}</div>
            <div class="lesson-body"><div class="lesson-subject">${b[0]} — ${b[1]}</div></div>
        </div>`).join("")}
    </div>`;
}

// === МЕРОПРИЯТИЯ ===
async function renderEvents() {
    document.getElementById("content").innerHTML =
        `<div class="card empty">Пока нет мероприятий</div>`;
}

// === ОБЪЯВЛЕНИЯ ===
async function renderAnnouncements() {
    document.getElementById("content").innerHTML =
        `<div class="card empty">Пока нет объявлений</div>`;
}

// === ПРОФИЛЬ ===
async function renderProfile() {
    document.getElementById("content").innerHTML = `<div class="card">
        <h2>Профиль</h2>
        <div class="lesson">
            <div class="lesson-num">👤</div>
            <div class="lesson-body">
                <div class="lesson-subject">Иван Иванов</div>
                <div class="lesson-cabinet">Класс: ${userClass}</div>
            </div>
        </div>
    </div>`;
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
navigate("schedule");