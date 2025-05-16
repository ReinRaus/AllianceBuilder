import * as state from './state.js';
import { translations } from './config.js'; // Для доступа к переводам напрямую в app.js

// Функциональные модули
import { setupGrid, redrawAllBuildings } from './gridUtils.js';
import {
    createBuilding as createBuildingInManager, // Переименовываем для ясности, если будут локальные createBuilding
    updateBuilding as updateBuildingInManager, // Аналогично
    deleteBuilding as deleteBuildingFromManager,
    shiftAllBuildings
} from './buildingManager.js';
import { setupDragAndDrop, createCursorGhostIconDOM } from './dragDrop.js';
import {
    updateLanguage,
    checkScreenSize,
    updateCastleDistanceDisplay,
    updateRotateButtonVisualState,
    updateDistanceToHGButtonVisualState
} from './uiManager.js';
import { saveStateToBase64, checkLocationHash } from './persistence.js';
import { setupTouchPinchZoom, setupTouchDragAndDrop } from './touchControls.js';


// --- Функции управления состоянием UI, специфичные для app.js ---

/** Переключает режим поворота сетки и обновляет UI кнопки. */
function toggleGridRotation() {
    state.setIsGridRotated(!state.isGridRotated); // Инвертируем состояние
    document.querySelector('.grid-container').classList.toggle('rotated', state.isGridRotated);
    updateRotateButtonVisualState(); // Обновляем вид кнопки

    // Если активен режим расстояний, перерисовываем их, так как поворот мог сброситься
    if (state.showDistanceToHG) {
        updateCastleDistanceDisplay();
    }
}

/** Переключает режим отображения расстояния до Адских Врат и обновляет UI. */
function toggleDistanceToHGMode() {
    state.setShowDistanceToHG(!state.showDistanceToHG); // Инвертируем состояние
    updateDistanceToHGButtonVisualState(); // Обновляем вид кнопки
    updateCastleDistanceDisplay(); // Обновляем отображение на замках
}


// --- Инициализация приложения ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Восстановление состояния из localStorage (язык, размер сетки)
    const savedLang = localStorage.getItem('alliancePlannerLang');
    if (savedLang && translations[savedLang]) { // Проверяем, что сохраненный язык существует в переводах
        state.setCurrentLang(savedLang);
    }
    const savedGridSize = localStorage.getItem('alliancePlannerGridSize');
    if (savedGridSize) {
        const parsedGridSize = parseInt(savedGridSize, 10);
        if (!isNaN(parsedGridSize) && parsedGridSize >=10 && parsedGridSize <=100) {
             state.setGridSize(parsedGridSize);
        }
    }

    // 2. Создание динамических DOM-элементов (например, иконка-призрак у курсора)
    createCursorGhostIconDOM();

    // 3. Загрузка состояния из URL (хэша), если оно там есть
    checkLocationHash(); // Это может обновить state.buildings и другие параметры, если они сохраняются

    // 4. Первичная настройка UI на основе текущего (возможно, загруженного) состояния
    document.getElementById('gridSizeInput').value = state.gridSize;
    document.querySelectorAll('.language-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === state.currentLang);
    });

    setupGrid();        // Инициализация сетки (создание ячеек)
    updateLanguage();   // Установка всех текстов интерфейса, включая кнопки управления видом
    redrawAllBuildings(); // Отрисовка зданий из state.buildings

    // Обновление визуального состояния кнопок управления видом после полной инициализации UI
    // updateLanguage уже должен вызывать updateRotateButtonVisualState
    // updateDistanceToHGButtonVisualState(); // Вызывается из updateLanguage косвенно, если кнопки имеют data-key

    // 5. Настройка глобальных обработчиков событий
    setupGlobalEventListeners();

    // 6. Инициализация специфичных элементов управления (Drag'n'Drop, Touch)
    setupDragAndDrop();
    setupTouchPinchZoom();
    setupTouchDragAndDrop(); // Инициализация, даже если не полностью реализована

    // 7. Первичная проверка размера экрана (также вызывается в updateLanguage)
    checkScreenSize();
});

// --- Настройка глобальных обработчиков событий ---
function setupGlobalEventListeners() {
    // Обработчики для модальных окон
    const playerNameModal = document.getElementById('playerNameModal');
    const renameModal = document.getElementById('renameModal');
    const closeButtons = document.querySelectorAll('.modal .close');
    const savePlayerNameButton = document.getElementById('savePlayerName');
    const saveRenameButton = document.getElementById('saveRename');

    closeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => { // Закрытие любой модалки по крестику
            const modalToClose = e.target.closest('.modal');
            if (modalToClose) {
                modalToClose.style.display = 'none';
            }
        });
    });

    // Сохранение имени при создании нового замка/зоны
    savePlayerNameButton.addEventListener('click', () => {
        const x = parseInt(playerNameModal.dataset.x, 10);
        const y = parseInt(playerNameModal.dataset.y, 10);
        const buildingType = playerNameModal.dataset.buildingType || 'castle';
        const playerName = document.getElementById('playerNameInput').value.trim(); // Обрезаем пробелы

        createBuildingInManager(buildingType, x, y, playerName);
        playerNameModal.style.display = 'none';
    });

    // Сохранение нового имени при переименовании
    saveRenameButton.addEventListener('click', () => {
        const buildingId = renameModal.dataset.buildingId;
        const newName = document.getElementById('renameInput').value.trim();
        const building = state.buildings.find(b => b.id === buildingId);

        if (building) {
            building.playerName = newName;
            // POTENTIAL_ISSUE: Аналогично, updateBuildingInManager - это то, что нужно вызывать.
            updateBuildingInManager(building); // Обновляем данные и DOM
            // updateBuildingsList(); // updateBuildingInManager может уже вызывать это, или нужно здесь.
            // В текущей структуре updateBuilding (в buildingManager) не обновляет список.
            // А uiManager.updateBuildingsList должна быть вызвана.
            // Проверить, где вызывается uiManager.updateBuildingsList после изменения имени.
            // Логично, если updateBuildingInManager сам обновляет всё, что нужно, или возвращает флаг.
            // Сейчас updateBuilding в buildingManager не вызывает updateBuildingsList.
            // Это значит, что список не обновится.
            // Нужно либо добавить вызов updateBuildingsList в updateBuilding (менее предпочтительно),
            // либо вызывать его здесь, либо в uiManager.showRenameModal после успешного сохранения.
            // В uiManager.updateBuildingsList он вызывается, если вызывать его из uiManager.showRenameModal.
            // Пока оставим как есть, но это точка для проверки.
            // Решение: uiManager.updateBuildingsList() вызывается из uiManager.updateLanguage(),
            // а также при каждом изменении массива buildings (create, delete). При простом rename - нет.
            // Значит, здесь нужен вызов:
            if (typeof uiManager !== 'undefined' && typeof uiManager.updateBuildingsList === 'function') { // Защита
                 uiManager.updateBuildingsList();
            } else if (typeof updateBuildingsList === 'function') { // Если импортирована напрямую
                 updateBuildingsList(); // POTENTIAL_ISSUE: updateBuildingsList не импортирована напрямую в app.js
            }
        }
        renameModal.style.display = 'none';
    });


    // Обработчики для кнопок управления видом (поворот, расстояние до врат)
    const rotateGridButton = document.getElementById('rotateGridButton');
    if (rotateGridButton) {
        rotateGridButton.addEventListener('click', toggleGridRotation);
    }
    const distanceToHGButton = document.getElementById('distanceToHGButton');
    if (distanceToHGButton) {
        distanceToHGButton.addEventListener('click', toggleDistanceToHGMode);
    }

    // Переключение языка
    const langButtons = document.querySelectorAll('.language-btn');
    langButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            state.setCurrentLang(btn.dataset.lang);
            localStorage.setItem('alliancePlannerLang', state.currentLang); // Сохраняем выбор
            langButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateLanguage(); // Обновляем весь интерфейс
        });
    });

    // Массовое смещение зданий
    const shiftControls = {
        Up: document.getElementById('shiftUpButton'),
        Down: document.getElementById('shiftDownButton'),
        Left: document.getElementById('shiftLeftButton'),
        Right: document.getElementById('shiftRightButton')
    };
    const handleShift = (dx, dy) => {
        if (state.isGridRotated) { // Сброс поворота перед смещением
            state.setIsGridRotated(false);
            document.querySelector('.grid-container').classList.remove('rotated');
            updateRotateButtonVisualState(); // Обновить состояние кнопки поворота
        }
        shiftAllBuildings(dx, dy); // Вызов функции из buildingManager
    };
    if (shiftControls.Up) shiftControls.Up.addEventListener('click', () => handleShift(0, -1));
    if (shiftControls.Down) shiftControls.Down.addEventListener('click', () => handleShift(0, 1));
    if (shiftControls.Left) shiftControls.Left.addEventListener('click', () => handleShift(-1, 0));
    if (shiftControls.Right) shiftControls.Right.addEventListener('click', () => handleShift(1, 0));

    // Изменение размера сетки
    const gridSizeInput = document.getElementById('gridSizeInput');
    const applyGridSizeButton = document.getElementById('applyGridSize');
    applyGridSizeButton.addEventListener('click', () => {
        const newSize = parseInt(gridSizeInput.value, 10);
        if (newSize >= 10 && newSize <= 100) {
            state.setGridSize(newSize);
            localStorage.setItem('alliancePlannerGridSize', newSize.toString()); // Сохраняем
            setupGrid();
            redrawAllBuildings();
        } else {
            gridSizeInput.value = state.gridSize; // Восстанавливаем валидное значение
            alert(translations[state.currentLang]?.invalidGridSize || // POTENTIAL_ISSUE: Ключа нет
                  (state.currentLang === 'ru' ? "Размер сетки должен быть от 10 до 100." : "Grid size must be between 10 and 100."));
        }
    });

    // Кнопка "Сохранить/Поделиться состоянием"
    const saveMainButton = document.getElementById('saveButton');
    if (saveMainButton) saveMainButton.addEventListener('click', saveStateToBase64);

    // Адаптация интерфейса при изменении размера окна
    window.addEventListener('resize', checkScreenSize);

    // Удаление выделенного здания клавишей Delete/Backspace
    document.addEventListener('keydown', (e) => {
        const activeElement = document.activeElement;
        const isInputFocused = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');

        if ((e.key === 'Delete' || e.key === 'Backspace') && !isInputFocused && state.selectedBuilding) {
            e.preventDefault(); // Предотвратить стандартное действие (например, переход назад)
            deleteBuildingFromManager(state.selectedBuilding);
            // state.selectedBuilding будет сброшен внутри deleteBuildingFromManager
        }
    });
}