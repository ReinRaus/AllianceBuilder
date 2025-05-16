// Импорты конфигурации и состояния - не нужны напрямую, т.к. используются в других модулях
// import { translations, buildingConfig } from './config.js';
// import * as state from './state.js';

// Импорты модулей с функциональностью
import { setupGrid, redrawAllBuildings } from './gridUtils.js';
import { deleteBuilding as deleteBuildingFromManager, selectBuilding as selectBuildingInManager, shiftAllBuildings  } from './buildingManager.js';
import { setupDragAndDrop, createCursorGhostIconDOM } from './dragDrop.js';
import {
    updateLanguage,
    showPlayerNameModal,
    showRenameModal,
    checkScreenSize,
    updateCastleDistanceDisplay, // Импортируем, если она в uiManager
    updateRotateButtonVisualState, // Импортируем
    updateDistanceToHGButtonVisualState // Импортируем
} from './uiManager.js';
import { saveStateToBase64, checkLocationHash } from './persistence.js';
import { setupTouchPinchZoom, setupTouchDragAndDrop } from './touchControls.js';
import { translations } from './config.js'; // Нужны translations для текста кнопок
import * as state from './state.js'; // Импортируем state для доступа к currentLang и gridSize для инициализации инпутов

function updateRotateButtonText() {
    const rotateButton = document.getElementById('rotateGridButton');
    if (rotateButton) {
        const key = state.isGridRotated ? 'resetRotation' : 'rotateGrid';
        rotateButton.textContent = translations[state.currentLang][key] || key;
        rotateButton.classList.toggle('active', state.isGridRotated);
    }
}

function toggleGridRotation() {
    state.setIsGridRotated(!state.isGridRotated);
    const gridContainer = document.querySelector('.grid-container');
    gridContainer.classList.toggle('rotated', state.isGridRotated);
    updateRotateButtonVisualState(); // Используем новую функцию
    if (state.showDistanceToHG) {
        updateCastleDistanceDisplay();
    }
}

function updateDistanceToHGButtonState() {
    const distanceButton = document.getElementById('distanceToHGButton');
    if (distanceButton) {
        distanceButton.classList.toggle('active', state.showDistanceToHG);
        // Текст кнопки не меняется, только ее состояние active/inactive
    }
}

function toggleDistanceToHGMode() {
    state.setShowDistanceToHG(!state.showDistanceToHG);
    updateDistanceToHGButtonVisualState(); // Используем новую функцию
    updateCastleDistanceDisplay();
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    // 1. Начальная настройка состояния (если нужно, например, из localStorage)
    const savedLang = localStorage.getItem('alliancePlannerLang');
    if (savedLang) {
        state.setCurrentLang(savedLang);
    }
    const savedGridSize = localStorage.getItem('alliancePlannerGridSize');
     if (savedGridSize) {
        state.setGridSize(parseInt(savedGridSize, 10));
    }


    // 2. Создание необходимых DOM-элементов, которые не в HTML (например, иконка-призрак)
    createCursorGhostIconDOM();

    // 3. Загрузка состояния из URL, если есть (должна быть до первой отрисовки)
    checkLocationHash(); // Это может обновить state.buildings

    // 4. Настройка UI (сетка, язык, списки) на основе текущего (возможно, загруженного) состояния
    // Устанавливаем начальные значения для инпутов из state
    document.getElementById('gridSizeInput').value = state.gridSize;
    document.querySelectorAll('.language-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === state.currentLang);
    });

    setupGrid();        // Создает ячейки сетки
    updateLanguage();   // Устанавливает все тексты, вызывает updateBuildingsList и checkScreenSize
    redrawAllBuildings(); // Рисует здания из state.buildings
    updateRotateButtonText(); // Установить правильный текст и состояние кнопки поворота
    updateDistanceToHGButtonState(); // Установить состояние кнопки расстояний
    updateRotateButtonVisualState();
    updateDistanceToHGButtonVisualState();

    // 5. Настройка глобальных обработчиков событий
    setupGlobalEventListeners();
    
    // 6. Настройка специфичных контролов (drag-n-drop, touch)
    setupDragAndDrop();
    setupTouchPinchZoom();
    setupTouchDragAndDrop(); // Попытка инициализации, даже если не полностью реализовано

    // 7. Первичная проверка размера экрана (уже вызывается в updateLanguage, но можно для уверенности)
    // checkScreenSize();
});

function setupGlobalEventListeners() {
    // Модальные окна
    const playerNameModal = document.getElementById('playerNameModal');
    const renameModal = document.getElementById('renameModal');
    const closeButtons = document.querySelectorAll('.modal .close');
    const savePlayerNameButton = document.getElementById('savePlayerName');
    const saveRenameButton = document.getElementById('saveRename');

    const rotateGridButton = document.getElementById('rotateGridButton');
    if (rotateGridButton) {
        rotateGridButton.addEventListener('click', toggleGridRotation);
        updateRotateButtonVisualState(); // Установить начальный текст и состояние
    }

    const distanceToHGButton = document.getElementById('distanceToHGButton');
    if (distanceToHGButton) {
        distanceToHGButton.addEventListener('click', toggleDistanceToHGMode);
        updateDistanceToHGButtonVisualState(); // Установить начальное состояние
    }

    closeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalToClose = e.target.closest('.modal');
            if (modalToClose) {
                modalToClose.style.display = 'none';
            }
        });
    });

    savePlayerNameButton.addEventListener('click', () => {
        const x = parseInt(playerNameModal.dataset.x);
        const y = parseInt(playerNameModal.dataset.y);
        const buildingType = playerNameModal.dataset.buildingType || 'castle'; // Получаем тип
        const playerName = document.getElementById('playerNameInput').value;
        createBuilding(buildingType, x, y, playerName);
        playerNameModal.style.display = 'none';
        document.getElementById('playerNameInput').value = '';
    });

    saveRenameButton.addEventListener('click', () => {
        const buildingId = renameModal.dataset.buildingId;
        const newName = document.getElementById('renameInput').value;
        const building = state.buildings.find(b => b.id === buildingId);
        if (building) {
            building.playerName = newName;
            updateBuilding(building); // Обновляем DOM здания
            updateBuildingsList();    // Обновляем список
        }
        renameModal.style.display = 'none';
    });

    // Переключение языка
    const langButtons = document.querySelectorAll('.language-btn');
    langButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            state.setCurrentLang(btn.dataset.lang);
            localStorage.setItem('alliancePlannerLang', state.currentLang);
            langButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateLanguage();
        });
    });

    // Слушатели для кнопок смещения
    const shiftUpButton = document.getElementById('shiftUpButton');
    const shiftDownButton = document.getElementById('shiftDownButton');
    const shiftLeftButton = document.getElementById('shiftLeftButton');
    const shiftRightButton = document.getElementById('shiftRightButton');

    const handleShift = (dx, dy) => {
        if (state.isGridRotated) { // Сбрасываем поворот перед смещением
            state.setIsGridRotated(false);
            document.querySelector('.grid-container').classList.remove('rotated');
            // updateRotateButtonVisualState(); // Обновить состояние кнопки поворота
            // Эту функцию нужно будет импортировать из uiManager.js, если она там
            // или вызвать аналогичную логику здесь.
            const rotateButton = document.getElementById('rotateGridButton');
            if (rotateButton && typeof updateRotateButtonVisualState === 'function') {
                 updateRotateButtonVisualState();
            } else if (rotateButton) { // запасной вариант, если функция не импортирована
                rotateButton.classList.remove('active');
                rotateButton.textContent = translations[state.currentLang]?.rotateGrid || "Rotate Grid";
            }
        }
        shiftAllBuildings(dx, dy);
    };

    if (shiftUpButton) {
        shiftUpButton.addEventListener('click', () => handleShift(0, -1));
    }
    if (shiftDownButton) {
        shiftDownButton.addEventListener('click', () => handleShift(0, 1));
    }
    if (shiftLeftButton) {
        shiftLeftButton.addEventListener('click', () => handleShift(-1, 0));
    }
    if (shiftRightButton) {
        shiftRightButton.addEventListener('click', () => handleShift(1, 0));
    }

    // Изменение размера сетки
    const gridSizeInput = document.getElementById('gridSizeInput');
    const applyGridSizeButton = document.getElementById('applyGridSize');
    applyGridSizeButton.addEventListener('click', () => {
        const newSize = parseInt(gridSizeInput.value);
        if (newSize >= 10 && newSize <= 100) {
            state.setGridSize(newSize);
            localStorage.setItem('alliancePlannerGridSize', newSize);
            setupGrid();
            redrawAllBuildings();
        } else {
            gridSizeInput.value = state.gridSize; // Восстанавливаем предыдущее значение
            alert(state.currentLang === 'ru' ? "Размер сетки должен быть от 10 до 100." : "Grid size must be between 10 and 100.");
        }
    });

    // Кнопка Сохранить (создание ссылки)
    const saveMainButton = document.getElementById('saveButton'); // Это кнопка "Сохранить" в хедере
    saveMainButton.addEventListener('click', saveStateToBase64);

    // Адаптивность при изменении размера окна
    window.addEventListener('resize', checkScreenSize);

    // Слушатель для удаления выделенного здания клавишей Delete
    document.addEventListener('keydown', (e) => {
        // Проверяем, что фокус не находится на поле ввода, чтобы не удалять текст
        const activeElement = document.activeElement;
        const isInputFocused = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');

        if (e.key === 'Delete' || e.key === 'Backspace') { // Backspace часто используется как Delete на Mac
            if (!isInputFocused && state.selectedBuilding) {
                e.preventDefault(); // Предотвращаем стандартное действие (например, переход назад в истории браузера для Backspace)
                
                // Сохраняем ID перед удалением, так как deleteBuildingFromManager может сбросить selectedBuilding
                const buildingIdToDelete = state.selectedBuilding; 
                deleteBuildingFromManager(buildingIdToDelete);
                // После удаления, selectedBuilding будет null (это делается внутри deleteBuildingFromManager)
                // Если нужно явно снять выделение, можно вызвать selectBuildingInManager(null);
                // но deleteBuildingFromManager уже должен это делать.
            }
        }
    });
}