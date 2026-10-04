let flashcards = JSON.parse(localStorage.getItem('anki_cards')) || [
    { front: "Привет", back: "Hello", interval: 0, repetition: 0, efactor: 2.5, nextReview: Date.now() },
    { front: "Книга", back: "Book", interval: 0, repetition: 0, efactor: 2.5, nextReview: Date.now() }
];

let currentQueue = [];
let currentCard = null;
let isFront = true;

// Элементы 3D карточки
const cardElement = document.getElementById("card-element");
const cardTextFront = document.getElementById("card-text-front");
const cardTextBack = document.getElementById("card-text-back");

const ankiButtons = document.getElementById("anki-buttons");
const btnNext = document.getElementById("btn-next");
const counterText = document.getElementById("counter");
const cardListContainer = document.getElementById("card-list");
const btnToggleList = document.getElementById("btn-toggle-list");

function saveToStorage() {
    localStorage.setItem('anki_cards', JSON.stringify(flashcards));
    renderCardList();
}

function resetAllIntervals() {
    if (confirm("Вы хотите сбросить прогресс повторений для всех карточек, чтобы пройти их заново прямо сейчас?")) {
        flashcards.forEach(card => {
            card.interval = 0;
            card.repetition = 0;
            card.efactor = 2.5;
            card.nextReview = Date.now();
        });
        saveToStorage();
        updateQueue();
        
        cardElement.classList.remove("flipped");
        cardTextFront.innerText = "Прогресс сброшен! Нажмите «Следующая»";
        ankiButtons.style.display = "none";
        btnNext.style.display = "inline-block";
        currentCard = null;
        
        alert("Все карточки снова готовы к изучению!");
    }
}

function addNewCard() {
    const frontInput = document.getElementById("new-front");
    const backInput = document.getElementById("new-back");

    if (frontInput.value.trim() === "" || backInput.value.trim() === "") {
        alert("Заполните оба поля!");
        return;
    }

    const newCard = {
        front: frontInput.value.trim(),
        back: backInput.value.trim(),
        interval: 0,
        repetition: 0,
        efactor: 2.5,
        nextReview: Date.now()
    };

    flashcards.push(newCard);
    saveToStorage();
    
    frontInput.value = "";
    backInput.value = "";
    updateQueue();
}

// Функция Свернуть/Развернуть список слов (Спойлер)
function toggleManagerList() {
    cardListContainer.classList.toggle("hidden");
    if (cardListContainer.classList.contains("hidden")) {
        btnToggleList.innerText = `Показать все карточки (${flashcards.length}) 👇`;
    } else {
        btnToggleList.innerText = `Скрыть список карточек ☝️`;
    }
}

function renderCardList() {
    cardListContainer.innerHTML = "";
    btnToggleList.innerText = cardListContainer.classList.contains("hidden") 
        ? `Показать все карточки (${flashcards.length}) 👇` 
        : `Скрыть список карточек ☝️`;
        
    flashcards.forEach((card, index) => {
        const item = document.createElement("div");
        item.className = "manager-item";
        item.innerHTML = `
            <span class="manager-text"><strong>${card.front}</strong> — ${card.back}</span>
            <div>
                <button class="btn-edit" onclick="editCard(${index})">✏️</button>
                <button class="btn-delete" onclick="deleteCard(${index})">❌</button>
            </div>
        `;
        cardListContainer.appendChild(item);
    });
}

// Удаление
function deleteCard(index) {
    if (confirm(`Вы уверены, что хотите удалить карточку "${flashcards[index].front}"?`)) {
        flashcards.splice(index, 1);
        saveToStorage();
        updateQueue();
        
        if (currentCard && !flashcards.includes(currentCard)) {
            currentCard = null;
            cardElement.classList.remove("flipped");
            cardTextFront.innerText = "Карточка удалена. Нажмите «Следующая»";
            ankiButtons.style.display = "none";
            btnNext.style.display = "inline-block";
        }
    }
}

// Редактирование
function editCard(index) {
    const card = flashcards[index];
    const newFront = prompt("Измените русское слово:", card.front);
    if (newFront === null) return;
    const newBack = prompt("Измените английский перевод:", card.back);
    if (newBack === null) return;
    
    if (newFront.trim() === "" || newBack.trim() === "") {
        alert("Поля не могут быть пустыми!");
        return;
    }
    
    card.front = newFront.trim();
    card.back = newBack.trim();
    saveToStorage();
    
    if (currentCard === card) {
        cardTextFront.innerText = card.front;
        cardTextBack.innerText = card.back;
    }
}

function updateQueue() {
    const now = Date.now();
    currentQueue = flashcards.filter(card => card.nextReview <= now);
    counterText.innerText = `Осталось карточек на данный момент: ${currentQueue.length}`;
}

function showCurrentCard() {
    updateQueue();
    
    if (currentQueue.length === 0) {
        cardElement.classList.remove("flipped");
        setTimeout(() => {
            cardTextFront.innerText = "🎉 Всё повторено! Подождите немного.";
        }, 300);
        ankiButtons.style.display = "none";
        btnNext.style.display = "inline-block";
        currentCard = null;
        return;
    }

    currentCard = currentQueue[0];
    isFront = true;
    
    // Возвращаем карточку в исходное (не перевернутое) состояние перед показом нового слова
    cardElement.classList.remove("flipped");
    
    // Небольшая задержка, чтобы текст менялся, пока карточка «спиной» к пользователю
    setTimeout(() => {
        cardTextFront.innerText = currentCard.front;
        cardTextBack.innerText = currentCard.back;
    }, 150);
    
    ankiButtons.style.display = "none";
    btnNext.style.display = "inline-block";
}

// Логика 3D переворота
function flipCard() {
    if (!currentCard) return;
    
    isFront = !isFront;
    if (isFront) {
        cardElement.classList.remove("flipped"); // Поворот на лицо
        ankiButtons.style.display = "none";
    } else {
        cardElement.classList.add("flipped");    // Поворот на оборот
        ankiButtons.style.display = "block";
        speakText(); 
    }
}

function handleAnswer(quality) {
    if (!currentCard) return;

    currentCard.efactor = currentCard.efactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (currentCard.efactor < 1.3) currentCard.efactor = 1.3;

    let nextIntervalMinutes = 0;

    if (quality === 1) {
        currentCard.repetition = 0;
        nextIntervalMinutes = 1;
    } else if (quality === 3) {
        currentCard.repetition = 0; 
        nextIntervalMinutes = 10;
    } else if (quality === 5) {
        currentCard.repetition += 1;
        if (currentCard.repetition === 1) {
            nextIntervalMinutes = 1440; 
        } else if (currentCard.repetition === 2) {
            nextIntervalMinutes = 8640; 
        } else {
            let currentDays = currentCard.interval / 1440;
            let nextDays = Math.round(currentDays * currentCard.efactor);
            nextIntervalMinutes = nextDays * 1440;
        }
    }

    currentCard.interval = nextIntervalMinutes;
    currentCard.nextReview = Date.now() + (nextIntervalMinutes * 60 * 1000);

    saveToStorage();
    showCurrentCard();
}

function speakText() {
    if (!currentCard) return;
    const textToSpeak = currentCard.back; 
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'en-US'; 
    window.speechSynthesis.cancel(); 
    window.speechSynthesis.speak(utterance);
}

updateQueue();
renderCardList();
setInterval(updateQueue, 10000);
