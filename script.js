// Загружаем карточки из памяти браузера, либо создаем стартовые
let flashcards = JSON.parse(localStorage.getItem('anki_cards')) || [
    { front: "Привет", back: "Hello", interval: 0, repetition: 0, efactor: 2.5, nextReview: Date.now() },
    { front: "Книга", back: "Book", interval: 0, repetition: 0, efactor: 2.5, nextReview: Date.now() }
];

let currentQueue = [];
let currentCard = null;
let isFront = true;

const cardText = document.getElementById("card-text");
const ankiButtons = document.getElementById("anki-buttons");
const btnNext = document.getElementById("btn-next");
const counterText = document.getElementById("counter");
const cardListContainer = document.getElementById("card-list");

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
        
        cardText.innerText = "Прогресс сброшен! Нажмите «Следующая»";
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
        interval: 0, // В минутах
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

function renderCardList() {
    cardListContainer.innerHTML = "";
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

function deleteCard(index) {
    if (confirm(`Вы уверены, что хотите удалить карточку "${flashcards[index].front}"?`)) {
        flashcards.splice(index, 1);
        saveToStorage();
        updateQueue();
        
        if (currentCard && !flashcards.includes(currentCard)) {
            currentCard = null;
            cardText.innerText = "Карточка удалена. Нажмите «Следующая»";
            ankiButtons.style.display = "none";
            btnNext.style.display = "inline-block";
        }
    }
}

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
        cardText.innerText = isFront ? card.front : card.back;
    }
}

function updateQueue() {
    const now = Date.now();
    // Отбираем карточки, время повторения которых уже наступило или прошло
    currentQueue = flashcards.filter(card => card.nextReview <= now);
    counterText.innerText = `Осталось карточек на данный момент: ${currentQueue.length}`;
}

function showCurrentCard() {
    updateQueue();
    
    if (currentQueue.length === 0) {
        cardText.innerText = "🎉 На данный момент всё повторено. Подождите немного, пока подойдёт время карточек!";
        ankiButtons.style.display = "none";
        btnNext.style.display = "inline-block";
        currentCard = null;
        return;
    }

    currentCard = currentQueue[0];
    isFront = true;
    cardText.innerText = currentCard.front; 
    
    ankiButtons.style.display = "none";
    btnNext.style.display = "inline-block";
}

function flipCard() {
    if (!currentCard) return;
    
    isFront = !isFront;
    if (isFront) {
        cardText.innerText = currentCard.front;
        ankiButtons.style.display = "none";
    } else {
        cardText.innerText = currentCard.back; 
        ankiButtons.style.display = "block";
        speakText(); 
    }
}

// НАСТРОЙКА ИНТЕРВАЛОВ КАК В ANKI
function handleAnswer(quality) {
    if (!currentCard) return;

    // Корректируем сложность
    currentCard.efactor = currentCard.efactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (currentCard.efactor < 1.3) currentCard.efactor = 1.3;

    let nextIntervalMinutes = 0;

    if (quality === 1) {
        // ПЛОХО: вернуть через 1 минуту
        currentCard.repetition = 0;
        nextIntervalMinutes = 1;
    } else if (quality === 3) {
        // НОРМАЛЬНО: вернуть через 10 минут
        currentCard.repetition = 0; 
        nextIntervalMinutes = 10;
    } else if (quality === 5) {
        // ОТЛИЧНО: переходим на дни
        currentCard.repetition += 1;
        if (currentCard.repetition === 1) {
            nextIntervalMinutes = 1440; // 1 день в минутах (24 * 60)
        } else if (currentCard.repetition === 2) {
            nextIntervalMinutes = 8640; // 6 дней в минутах (6 * 24 * 60)
        } else {
            // Умножаем прошлый интервал (переведенный в дни) на коэффициент сложности
            let currentDays = currentCard.interval / 1440;
            let nextDays = Math.round(currentDays * currentCard.efactor);
            nextIntervalMinutes = nextDays * 1440;
        }
    }

    currentCard.interval = nextIntervalMinutes;
    // Высчитываем точное время следующего показа
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

// Автоматически обновляем очередь каждые 10 секунд, чтобы вовремя подгружать минутные карточки
setInterval(updateQueue, 10000);
