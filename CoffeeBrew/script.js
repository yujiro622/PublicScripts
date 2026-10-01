const recipeSelect = document.getElementById("recipe-select");
const recipeContent = document.getElementById("recipe-content");
const recipeName = document.getElementById("recipe-name");
const coffeeGrams = document.getElementById("coffee-grams");
const waterMl = document.getElementById("water-ml");
const stepsList = document.getElementById("steps-list");
const loadError = document.getElementById("load-error");
const timerReadout = document.getElementById("timer-readout");
const timerStatus = document.getElementById("timer-status");
const nextStepLabel = document.getElementById("next-step-label");
const nextStepValue = document.getElementById("next-step-value");
const timerProgress = document.getElementById("timer-progress");
const startPauseButton = document.getElementById("start-pause");
const finishButton = document.getElementById("finish-button");
const resetButton = document.getElementById("reset-button");

let recipes = [];
let selectedRecipe = null;
let timerState = "idle";
let elapsedBeforeStart = 0;
let startedAt = 0;
let timerInterval = null;

const formatTime = (milliseconds, showTenths = false) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const base = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    return showTenths ? `${base}.${Math.floor((milliseconds % 1000) / 100)}` : base;
};

const getElapsed = () => elapsedBeforeStart + (timerState === "running" ? performance.now() - startedAt : 0);

const isValidRecipe = recipe => {
    if (!recipe || typeof recipe.id !== "string" || typeof recipe.name !== "string") return false;
    if (!Number.isFinite(recipe.coffeeGrams) || !Number.isFinite(recipe.waterMl)) return false;
    if (!Array.isArray(recipe.steps) || recipe.steps.length === 0) return false;
    return recipe.steps.every((step, index) =>
        Number.isFinite(step.timeSeconds) && step.timeSeconds >= 0 &&
        typeof step.label === "string" &&
        (index === 0 || step.timeSeconds > recipe.steps[index - 1].timeSeconds)
    );
};

const renderRecipe = () => {
    recipeName.textContent = selectedRecipe.name;
    coffeeGrams.textContent = selectedRecipe.coffeeGrams;
    waterMl.textContent = selectedRecipe.waterMl;
    stepsList.replaceChildren();

    selectedRecipe.steps.forEach((step, index) => {
        const row = document.createElement("li");
        row.className = "step-row";
        row.dataset.stepIndex = index;

        const time = document.createElement("span");
        time.className = "step-time";
        time.textContent = formatTime(step.timeSeconds * 1000);

        const label = document.createElement("span");
        label.className = "step-label";
        label.textContent = step.label;

        const marker = document.createElement("span");
        marker.className = "step-marker";
        marker.setAttribute("aria-hidden", "true");

        row.append(time, label, marker);
        stepsList.appendChild(row);
    });

    recipeContent.hidden = false;
    renderTimer();
};

const renderTimer = () => {
    const elapsed = getElapsed();
    timerReadout.textContent = formatTime(elapsed, true);
    timerReadout.setAttribute("aria-label", `経過時間 ${formatTime(elapsed)}`);

    const steps = selectedRecipe?.steps || [];
    const elapsedSeconds = elapsed / 1000;
    const activeIndex = steps.reduce((latest, step, index) =>
        elapsedSeconds >= step.timeSeconds ? index : latest, -1);
    const nextIndex = steps.findIndex(step => elapsedSeconds < step.timeSeconds);
    const rows = stepsList.querySelectorAll(".step-row");

    rows.forEach((row, index) => {
        row.classList.toggle("is-complete", index < activeIndex);
        row.classList.toggle("is-active", index === activeIndex);
    });

    if (nextIndex !== -1) {
        const nextStep = steps[nextIndex];
        nextStepLabel.textContent = timerState === "idle" ? "最初の目標" : "次の手順";
        nextStepValue.textContent = `${formatTime(nextStep.timeSeconds * 1000)}  /  ${nextStep.label}`;
    } else if (steps.length > 0) {
        nextStepLabel.textContent = "目標時刻";
        nextStepValue.textContent = `${formatTime(steps[steps.length - 1].timeSeconds * 1000)}  /  抽出完了`;
    }

    const finalTime = steps.at(-1)?.timeSeconds || 0;
    const progress = finalTime ? Math.min(elapsedSeconds / finalTime, 1) * 100 : 0;
    timerProgress.style.width = `${progress}%`;

    const statusLabels = {
        idle: "準備完了",
        running: "抽出中",
        paused: "一時停止中",
        finished: "抽出完了"
    };
    timerStatus.textContent = statusLabels[timerState];
    timerStatus.classList.toggle("is-running", timerState === "running");
    timerStatus.classList.toggle("is-paused", timerState === "paused");

    const buttonText = timerState === "paused" ? "再開" : timerState === "running" ? "一時停止" : "スタート";
    const buttonSymbol = timerState === "running" ? "Ⅱ" : "▶";
    startPauseButton.querySelector("span:last-child").textContent = buttonText;
    startPauseButton.querySelector(".button-symbol").textContent = buttonSymbol;
    startPauseButton.disabled = timerState === "finished" || !selectedRecipe;
    finishButton.disabled = timerState !== "running" && timerState !== "paused";
    resetButton.disabled = timerState === "idle";
    recipeSelect.disabled = timerState === "running";
};

const stopTimerInterval = () => {
    if (timerInterval !== null) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
};

const startTimer = () => {
    if (timerState === "finished" || !selectedRecipe) return;
    startedAt = performance.now();
    timerState = "running";
    timerInterval = window.setInterval(renderTimer, 50);
    renderTimer();
};

const pauseTimer = () => {
    elapsedBeforeStart = getElapsed();
    stopTimerInterval();
    timerState = "paused";
    renderTimer();
};

const resetTimer = () => {
    stopTimerInterval();
    elapsedBeforeStart = 0;
    timerState = "idle";
    renderTimer();
};

const finishTimer = () => {
    elapsedBeforeStart = getElapsed();
    stopTimerInterval();
    timerState = "finished";
    renderTimer();
};

const handleStartPause = () => {
    if (timerState === "running") {
        pauseTimer();
    } else {
        startTimer();
    }
};

const loadRecipes = async () => {
    try {
        const response = await fetch("recipes.json");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0 || !data.every(isValidRecipe)) {
            throw new Error("レシピデータの形式が正しくありません");
        }

        recipes = data;
        recipeSelect.replaceChildren();
        recipes.forEach(recipe => {
            const option = document.createElement("option");
            option.value = recipe.id;
            option.textContent = recipe.name;
            recipeSelect.appendChild(option);
        });

        selectedRecipe = recipes[0];
        recipeSelect.value = selectedRecipe.id;
        recipeSelect.disabled = false;
        startPauseButton.disabled = false;
        renderRecipe();
    } catch (error) {
        loadError.textContent = `レシピを読み込めませんでした。recipes.jsonを確認してください。(${error.message})`;
        loadError.hidden = false;
        timerStatus.textContent = "読み込みエラー";
        nextStepValue.textContent = "レシピデータを確認してください";
    }
};

recipeSelect.addEventListener("change", () => {
    selectedRecipe = recipes.find(recipe => recipe.id === recipeSelect.value);
    resetTimer();
    renderRecipe();
});

startPauseButton.addEventListener("click", handleStartPause);
finishButton.addEventListener("click", finishTimer);
resetButton.addEventListener("click", resetTimer);

loadRecipes();