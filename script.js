// Загружаем карточки из памяти браузера, либо создаем стартовые
let flashcards = JSON.parse(localStorage.getItem('anki_cards')) || [
    { front: "Привет", back: "Hello", interval: 1, repetition: 0, efactor: 2.5, nextReview: Date.now() },
    { front: "Книга", back: "Book", interval: 1, repetition: 0, efactor: 2.5, nextReview: Date.now() }
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
    renderCardList(); // Перерисовываем список при каждом изменении
}

// Добавление новой карточки
function addNewCard() {
    const frontInput = document.getElementById("new-front"); // Русский текст
    const backInput = document.getElementById("new-back");   // Английский текст

    if (frontInput.value.trim() === "" || backInput.value.trim() === "") {
        alert("Заполните оба поля!");
        return;
    }

    const newCard = {
        front: frontInput.value.trim(),
        back: backInput.value.trim(),
        interval: 1,
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

// Отображение списка всех слов под карточкой с кнопками УДАЛИТЬ и РЕДАКТИРОВАТЬ
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

// Функция УДАЛЕНИЯ карточки
function deleteCard(index) {
    if (confirm(`Вы уверены, что хотите удалить карточку "${flashcards[index].front}"?`)) {
        flashcards.splice(index, 1); // Удаляем из массива
        saveToStorage();
        updateQueue();
        
        // Если удалили карточку, которую сейчас учили, сбрасываем экран
        if (currentCard && !flashcards.includes(currentCard)) {
            currentCard = null;
            cardText.innerText = "Карточка удалена. Нажмите «Следующая»";
            ankiButtons.style.display = "none";
            btnNext.style.display = "inline-block";
        }
    }
}

// Функция РЕДАКТИРОВАНИЯ карточки
function editCard(index) {
    const card = flashcards[index];
    
    const newFront = prompt("Измените русское слово:", card.front);
    if (newFront === null) return; // Нажали отмену
    
    const newBack = prompt("Измените английский перевод:", card.back);
    if (newBack === null) return; // Нажали отмену
    
    if (newFront.trim() === "" || newBack.trim() === "") {
        alert("Поля не могут быть пустыми!");
        return;
    }
    
    card.front = newFront.trim();
    card.back = newBack.trim();
    
    saveToStorage();
    
    // Если редактировали текущую карточку, обновляем текст на экране
    if (currentCard === card) {
        cardText.innerText = isFront ? card.front : card.back;
    }
}

function updateQueue() {
    const now = Date.now();
    currentQueue = flashcards.filter(card => card.nextReview <= now);
    counterText.innerText = `Осталось карточек на сегодня: ${currentQueue.length}`;
}

function showCurrentCard() {
    updateQueue();
    
    if (currentQueue.length === 0) {
        cardText.innerText = "🎉 Отлично! Все карточки на сегодня повторены.";
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

function handleAnswer(quality) {
    if (!currentCard) return;

    currentCard.efactor = currentCard.efactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (currentCard.efactor < 1.3) currentCard.efactor = 1.3;

    if (quality < 3) {
        currentCard.repetition = 0;
        currentCard.interval = 1;
    } else {
        currentCard.repetition += 1;
        if (currentCard.repetition === 1) {
            currentCard.interval = 1;
        } else if (currentCard.repetition === 2) {
            currentCard.interval = 6;
        } else {
            currentCard.interval = Math.round(currentCard.interval * currentCard.efactor);
        }
    }

    const daysInMs = currentCard.interval * 24 * 60 * 60 * 1000;
    currentCard.nextReview = Date.now() + daysInMs;

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

// Запуск при старте страницы
updateQueue();
renderCardList();
