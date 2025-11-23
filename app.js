// app.js - Основной файл приложения, точка входа и координатор модулей

// --- Импорты модулей и конфигурации ---
import * as state from './state.js';
import { translations, buildingConfig } from './config.js';

// Функциональные модули
import { setupGrid, redrawAllBuildings } from './gridUtils.js';
import {
    createBuilding as createBuildingInManager,
    updateBuilding as updateBuildingInManager,
    deleteBuilding as deleteBuildingFromManager,
    shiftAllBuildings,
    checkOverlap as checkOverlapInManager // Импортируем checkOverlap
} from './buildingManager.js';
import {
    setupDragAndDrop, createCursorGhostIconDOM,
    createMobilePlacementGhostDOM, showMobilePlacementGhost,
    positionMobilePlacementGhost, hideMobilePlacementGhost,
    updateFullGhostOnGrid, removeFullGhostFromGrid
} from './dragDrop.js';
import {
    updateLanguage, checkScreenSize, updateCastleDistanceDisplay,
    updateAverageDistanceDisplay,
    updateRotateButtonVisualState, updateDistanceToHGButtonVisualState,
    showPlayerNameModal, showRenameModal, updateSelectedBuildingToolbar,
} from './uiManager.js';
import { saveStateToBase64, checkLocationHash } from './persistence.js';
import { setupTouchPinchZoom } from './touchControls.js'; // addTouchHandlersToBuilding больше не нужен здесь, он в buildingManager

// --- Локальное состояние UI этого модуля (app.js) ---
let isSidebarOpen = false;

// Переменные для хранения ссылок на обработчики событий мобильного D&D
let currentMobileToolType = null; // Тип здания, выбранного на мобильной панели
let activeMobileToolButton = null; // Кнопка инструмента, которая сейчас "активна"
let mobileGridPlacementProcessed = false; // Флаг для предотвращения двойного размещения при touch+click

// --- Функции управления основным UI и режимами ---
function toggleGridRotation() {
    // Закрыть сайдбар на мобильных перед вращением, чтобы избежать визуального беспорядка
    if (isSidebarOpen) {
        toggleMobileSidebar();
    }
    
    cancelMobileDragMode();
    state.setIsGridRotated(!state.isGridRotated);
    document.querySelector('.grid-container')?.classList.toggle('rotated', state.isGridRotated);
    updateRotateButtonVisualState();
    if (state.showDistanceToHG) {
        updateCastleDistanceDisplay();
    }
}

function toggleDistanceToHGMode() {
    cancelMobileDragMode();
    state.setShowDistanceToHG(!state.showDistanceToHG);
    updateDistanceToHGButtonVisualState();
    updateCastleDistanceDisplay();
    updateAverageDistanceDisplay();
}

// --- Функции управления мобильным интерфейсом ---
function toggleMobileSidebar() {
    const sidebar = document.getElementById('mobileSidebar');
    const pageContent = document.getElementById('pageContent');
    const body = document.body;

    isSidebarOpen = !isSidebarOpen;
    sidebar?.classList.toggle('open', isSidebarOpen);
    body.classList.toggle('sidebar-open', isSidebarOpen);

    if (isSidebarOpen) {
        cancelMobileDragMode();
        synchronizeMobileControls();
    } else {
        if (sidebar?.contains(document.activeElement)) {
            document.activeElement.blur();
        }
    }
}

function initializeMobileInterface() {
    populateMobileToolbarSlider();
    setupMobileSidebarContent();
    synchronizeMobileControls();
}

function populateMobileToolbarSlider() {
    const sliderContent = document.querySelector('#mobileToolbarSlider .slider-content');
    const desktopToolbar = document.getElementById('toolbarDesktop');
    if (!sliderContent || !desktopToolbar) return;
    sliderContent.innerHTML = '';

    desktopToolbar.querySelectorAll('.building-item[data-type]').forEach(item => {
        const type = item.dataset.type;
        const config = buildingConfig[type];
        if (!config) return;

        const sliderItemButton = document.createElement('button');
        sliderItemButton.className = 'tool-slider-item building-tool';
        sliderItemButton.dataset.type = type;
        sliderItemButton.innerHTML = `<span class="icon">${config.icon}</span>`;
        const translatedName = translations[state.currentLang]?.[type] || type;
        sliderItemButton.setAttribute('aria-label', translatedName);
        sliderItemButton.title = translatedName;

        // Используем 'click' для простоты, т.к. touchstart/move/end будут для сетки
        sliderItemButton.addEventListener('click', () => handleMobileBuildingToolSelect(type, sliderItemButton));
        sliderContent.appendChild(sliderItemButton);
    });

    const shiftControlsDesktop = desktopToolbar.querySelector('.shift-controls');
    if (shiftControlsDesktop) {
        shiftControlsDesktop.querySelectorAll('.shift-btn').forEach(btn => {
            const newShiftBtn = document.createElement('button');
            newShiftBtn.className = 'tool-slider-item shift-tool-icon';
            newShiftBtn.innerHTML = btn.textContent;
            newShiftBtn.title = btn.title || btn.getAttribute('aria-label');
            newShiftBtn.setAttribute('aria-label', btn.title || btn.getAttribute('aria-label'));
            const actionId = btn.id.toLowerCase();
            let dx = 0, dy = 0;
            if (actionId.includes('up')) dy = -1;
            else if (actionId.includes('down')) dy = 1;
            else if (actionId.includes('left')) dx = -1;
            else if (actionId.includes('right')) dx = 1;
            newShiftBtn.addEventListener('click', () => handleShift(dx, dy));
            sliderContent.appendChild(newShiftBtn);
        });
    }
}

function setupMobileSidebarContent() {
    const desktopLangSwitcher = document.querySelector('.language-switcher.desktop-only');
    const mobileLangContainer = document.querySelector('.language-switcher-mobile');
    if (desktopLangSwitcher && mobileLangContainer && mobileLangContainer.children.length === 0) {
        desktopLangSwitcher.querySelectorAll('.language-btn').forEach(btn => {
            const clone = btn.cloneNode(true);
            clone.addEventListener('click', () => languageChangeHandler(clone.dataset.lang));
            mobileLangContainer.appendChild(clone);
        });
    }
}

function synchronizeMobileControls() {
    const mobileGridSizeInput = document.getElementById('gridSizeInputMobile');
    if (mobileGridSizeInput) mobileGridSizeInput.value = state.gridSize;
    updateRotateButtonVisualState();
    updateDistanceToHGButtonVisualState();
    const mobileLangContainer = document.querySelector('.language-switcher-mobile');
    if (mobileLangContainer) {
        mobileLangContainer.querySelectorAll('.language-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === state.currentLang);
        });
    }
}

// --- Логика мобильного "выбора инструмента и размещения" ---

/** Отменяет текущий режим выбора инструмента для мобильного размещения. */
function cancelMobileDragMode() {
    if (!state.isMobileDragging) return;

    state.setIsMobileDragging(false);
    currentMobileToolType = null; // Сбрасываем выбранный тип
    if (activeMobileToolButton) {
        activeMobileToolButton.classList.remove('active');
        activeMobileToolButton = null;
    }

    hideMobilePlacementGhost(); // Маленький призрак у пальца/мыши (если использовался)
    removeFullGhostFromGrid();  // Полный призрак на сетке

    // Удаляем обработчики с сетки, если они были добавлены для этого режима
    const gridElement = document.getElementById('grid');
    if (gridElement) {
        gridElement.removeEventListener('touchmove', handleMobileGridHover);
        gridElement.removeEventListener('mousemove', handleMobileGridHover); // Для отладки мышью
        gridElement.removeEventListener('touchend', handleMobileGridPlacement);
        gridElement.removeEventListener('click', handleMobileGridPlacement); // Для отладки мышью
        gridElement.removeEventListener('touchcancel', handleMobileGridCancel); // Для обработки отмены касания
        gridElement.removeEventListener('touchleave', handleMobileGridLeave); // Для скрытия призрака
        gridElement.removeEventListener('mouseleave', handleMobileGridLeave); // Для скрытия призрака
    }
    // Сбрасываем глобальное состояние draggedType, которое могло использоваться для призрака
    state.setDraggedType(null);
    // Сбрасываем флаг двойного размещения
    mobileGridPlacementProcessed = false;
}


/** Обрабатывает выбор инструмента здания на мобильной панели. */
function handleMobileBuildingToolSelect(type, clickedItem) {
    if (state.isMobileDragging && currentMobileToolType === type) {
        // Повторный клик на тот же активный инструмент - отменяем режим
        cancelMobileDragMode();
        return;
    }

    cancelMobileDragMode(); // Отменяем предыдущий выбор, если он был

    if (state.isGridRotated) {
        state.setIsGridRotated(false);
        document.querySelector('.grid-container')?.classList.remove('rotated');
        updateRotateButtonVisualState();
    }

    state.setIsMobileDragging(true); // Включаем режим "ожидания тапа на сетку"
    currentMobileToolType = type;    // Запоминаем выбранный тип
    state.setDraggedType(type);      // Устанавливаем для отображения призрака
    activeMobileToolButton = clickedItem;
    activeMobileToolButton?.classList.add('active');

    // Показываем маленький призрак у пальца/мыши как индикатор активного инструмента
    // Это опционально, можно сразу показывать полный призрак на сетке при hover
    // showMobilePlacementGhost(type);

    // Добавляем слушатели на сетку для отображения "полного призрака" при наведении
    // и для размещения здания при тапе/клике.
    const gridElement = document.getElementById('grid');
    if (!gridElement) {
        cancelMobileDragMode();
        return;
    }

    gridElement.addEventListener('touchmove', handleMobileGridHover, { passive: false });
    gridElement.addEventListener('mousemove', handleMobileGridHover); // Для отладки мышью
    gridElement.addEventListener('touchend', handleMobileGridPlacement);
    gridElement.addEventListener('click', handleMobileGridPlacement);   // Для отладки мышью
    gridElement.addEventListener('touchcancel', handleMobileGridCancel); // Для обработки отмены касания
    gridElement.addEventListener('touchleave', handleMobileGridLeave);
    gridElement.addEventListener('mouseleave', handleMobileGridLeave);
}

/** Обрабатывает "наведение" (touchmove/mousemove) на сетку в режиме мобильного размещения. */
function handleMobileGridHover(event) {
    if (!state.isMobileDragging || !currentMobileToolType) return;
    if (event.type === 'touchmove') event.preventDefault(); // Предотвращаем скролл

    const gridElement = document.getElementById('grid');
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    const rect = gridElement.getBoundingClientRect();
    const x = Math.floor((clientX - rect.left) / state.cellSize);
    const y = Math.floor((clientY - rect.top) / state.cellSize);

    if (x >= 0 && x < state.gridSize && y >= 0 && y < state.gridSize) {
        updateFullGhostOnGrid(currentMobileToolType, x, y); // Показываем/обновляем полный призрак
    } else {
        removeFullGhostFromGrid(); // Убираем полный призрак, если палец/мышь вне сетки
    }
}

/** Обрабатывает "уход" пальца/мыши с сетки в режиме мобильного размещения. */
function handleMobileGridLeave() {
    if (state.isMobileDragging) {
        removeFullGhostFromGrid();
    }
}

/** Обрабатывает отмену касания (touchcancel) - например, системный жест iOS. */
function handleMobileGridCancel() {
    if (state.isMobileDragging) {
        removeFullGhostFromGrid();
        cancelMobileDragMode();
    }
}

/** Обрабатывает "тап" (touchend) или клик на сетку для размещения выбранного здания. */
function handleMobileGridPlacement(event) {
    // Флаг для предотвращения двойного размещения при touch+click на мобильных
    if (mobileGridPlacementProcessed) return;
    
    if (!state.isMobileDragging || !currentMobileToolType) {
        // Если это был клик, а не touchend после выбора инструмента, и режим не активен, ничего не делаем.
        // Если это touchend, но режим уже сброшен (например, из-за touchcancel), тоже ничего.
        return;
    }
    // Для клика мыши, если он произошел после выбора инструмента
    if (event.type === 'click' && (!activeMobileToolButton || !activeMobileToolButton.classList.contains('active'))) {
        return;
    }

    mobileGridPlacementProcessed = true; // Установить флаг перед размещением

    const gridElement = document.getElementById('grid');
    const clientX = event.changedTouches ? event.changedTouches[0].clientX : event.clientX;
    const clientY = event.changedTouches ? event.changedTouches[0].clientY : event.clientY;
    const rect = gridElement.getBoundingClientRect();
    const x = Math.floor((clientX - rect.left) / state.cellSize);
    const y = Math.floor((clientY - rect.top) / state.cellSize);

    if (x >= 0 && x < state.gridSize && y >= 0 && y < state.gridSize) {
        const typeToPlace = currentMobileToolType;
        const config = buildingConfig[typeToPlace];
        
        // Используем checkOverlapInManager для проверки перед созданием
        if (config && !checkOverlapInManager(x, y, config.size, config.size)) {
            if (typeToPlace === 'castle') {
                const castleCount = state.buildings.filter(b => b.type === 'castle').length;
                const prefixKey = translations[state.currentLang]?.defaultCastleNamePrefix || "Castle #";
                const defaultName = prefixKey.replace('#', castleCount + 1);
                createBuildingInManager(typeToPlace, x, y, defaultName);
            } else if (typeToPlace === 'deadzone') {
                createBuildingInManager(typeToPlace, x, y, '');
            } else {
                createBuildingInManager(typeToPlace, x, y);
            }
        } else {
            alert(translations[state.currentLang]?.cannotOverlapMsg || "Невозможно разместить здание здесь.");
        }
    }
    // После попытки размещения (успешной или нет) отменяем режим выбора инструмента.
    // Это позволит пользователю сразу выбрать другой инструмент или сделать другое действие.
    cancelMobileDragMode();
}


// --- Общие обработчики для UI ---
const handleShift = (dx, dy) => {
    cancelMobileDragMode();
    if (state.isGridRotated) {
        state.setIsGridRotated(false);
        document.querySelector('.grid-container')?.classList.remove('rotated');
        updateRotateButtonVisualState();
    }
    shiftAllBuildings(dx, dy);
};

function languageChangeHandler(lang) {
    if (state.currentLang === lang || !translations[lang]) return;
    cancelMobileDragMode();
    state.setCurrentLang(lang);
    localStorage.setItem('alliancePlannerLang', lang);
    document.querySelectorAll('.language-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.lang === lang);
    });
    updateLanguage();
    if (document.body.classList.contains('mobile-view')) {
        populateMobileToolbarSlider();
    }
    synchronizeMobileControls();
}

function applyGridSizeChange() {
    cancelMobileDragMode();
    const inputId = document.body.classList.contains('mobile-view') ? 'gridSizeInputMobile' : 'gridSizeInputDesktop';
    const gridSizeInput = document.getElementById(inputId);
    if (!gridSizeInput) return;
    const newSize = parseInt(gridSizeInput.value, 10);

    if (newSize >= 10 && newSize <= 100) {
        state.setGridSize(newSize);
        localStorage.setItem('alliancePlannerGridSize', newSize.toString());
        // Синхронизируем оба инпута, но с проверкой существования
        const desktopInput = document.getElementById('gridSizeInputDesktop');
        const mobileInput = document.getElementById('gridSizeInputMobile');
        if (desktopInput) desktopInput.value = newSize;
        if (mobileInput) mobileInput.value = newSize;
        setupGrid();
        redrawAllBuildings();
    } else {
        gridSizeInput.value = state.gridSize;
        alert(translations[state.currentLang]?.invalidGridSize || "Размер сетки должен быть от 10 до 100.");
    }
}

// --- Инициализация приложения ---
document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('alliancePlannerLang');
    if (savedLang && translations[savedLang]) state.setCurrentLang(savedLang);
    
    // Обновляем активность кнопок языка в соответствии с сохраненным языком
    document.querySelectorAll('.language-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === state.currentLang);
    });
    
    const savedGridSize = localStorage.getItem('alliancePlannerGridSize');
    if (savedGridSize) {
        const parsedGridSize = parseInt(savedGridSize, 10);
        if (!isNaN(parsedGridSize) && parsedGridSize >= 10 && parsedGridSize <= 100) {
            state.setGridSize(parsedGridSize);
        }
    }

    createCursorGhostIconDOM();
    // createMobilePlacementGhostDOM(); // Мобильный призрак у пальца больше не нужен, используем полный

    checkLocationHash();

    document.getElementById('gridSizeInputDesktop').value = state.gridSize;

    setupGrid();
    initializeMobileInterface();
    updateLanguage();
    redrawAllBuildings();
    updateSelectedBuildingToolbar();

    setupGlobalEventListeners();
    setupDragAndDrop();
    setupTouchPinchZoom();
});

// --- Настройка глобальных обработчиков событий ---
function setupGlobalEventListeners() {
    document.getElementById('openSidebarBtn')?.addEventListener('click', toggleMobileSidebar);
    document.getElementById('closeSidebarBtn')?.addEventListener('click', toggleMobileSidebar);
    document.body.addEventListener('click', (event) => {
        if (isSidebarOpen && event.target === document.body && document.body.classList.contains('sidebar-open')) {
            toggleMobileSidebar();
        }
    });

    const playerNameModal = document.getElementById('playerNameModal');
    const renameModal = document.getElementById('renameModal');
    const playerNameInput = document.getElementById('playerNameInput');
    const renameInput = document.getElementById('renameInput');
    
    document.querySelectorAll('.modal .close').forEach(btn => {
        btn.addEventListener('click', () => {
            cancelMobileDragMode();
            btn.closest('.modal').style.display = 'none';
        });
    });
    
    // Обработчик сохранения имени игрока (создание замка/мертвой зоны)
    const savePlayerNameHandler = () => {
        cancelMobileDragMode();
        const x = parseInt(playerNameModal.dataset.x, 10);
        const y = parseInt(playerNameModal.dataset.y, 10);
        const buildingType = playerNameModal.dataset.buildingType || 'castle';
        const playerName = playerNameInput.value.trim();
        createBuildingInManager(buildingType, x, y, playerName);
        playerNameModal.style.display = 'none';
    };
    
    document.getElementById('savePlayerName').addEventListener('click', savePlayerNameHandler);
    playerNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            savePlayerNameHandler();
        }
    });
    
    // Обработчик переименования здания
    const saveRenameHandler = () => {
        cancelMobileDragMode();
        const buildingId = renameModal.dataset.buildingId;
        const newName = renameInput.value.trim();
        const building = state.buildings.find(b => b.id === buildingId);
        if (building) {
            building.playerName = newName;
            updateBuildingInManager(building);
            updateSelectedBuildingToolbar();
            if (state.showDistanceToHG && building.type === 'castle') {
                updateCastleDistanceDisplay();
            }
            // Обновить среднее расстояние если переименовали замок или адские врата
            if (building.type === 'castle' || building.type === 'hellgates') {
                updateAverageDistanceDisplay();
            }
        }
        renameModal.style.display = 'none';
    };
    
    document.getElementById('saveRename').addEventListener('click', saveRenameHandler);
    renameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveRenameHandler();
        }
    });

    const commonViewButtonHandler = (action) => {
        if (action === 'rotate') toggleGridRotation();
        else if (action === 'distance') toggleDistanceToHGMode();
    };
    ['rotateGridButtonDesktop', 'rotateGridButtonMobile'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', () => commonViewButtonHandler('rotate'));
    });
    ['distanceToHGButtonDesktop', 'distanceToHGButtonMobile'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', () => commonViewButtonHandler('distance'));
    });

    document.querySelectorAll('.language-switcher.desktop-only .language-btn').forEach(btn => {
        btn.addEventListener('click', () => languageChangeHandler(btn.dataset.lang));
    });

    document.getElementById('shiftUpButtonDesktop')?.addEventListener('click', () => handleShift(0, -1));
    document.getElementById('shiftDownButtonDesktop')?.addEventListener('click', () => handleShift(0, 1));
    document.getElementById('shiftLeftButtonDesktop')?.addEventListener('click', () => handleShift(-1, 0));
    document.getElementById('shiftRightButtonDesktop')?.addEventListener('click', () => handleShift(1, 0));

    document.getElementById('applyGridSizeDesktop')?.addEventListener('click', applyGridSizeChange);
    document.getElementById('applyGridSizeMobile')?.addEventListener('click', applyGridSizeChange);

    const shareActionHandler = () => {
        cancelMobileDragMode();
        saveStateToBase64();
    };
    document.getElementById('shareButtonDesktop')?.addEventListener('click', shareActionHandler);
    document.getElementById('shareButtonMobile')?.addEventListener('click', shareActionHandler);

    document.getElementById('renameSelectedBuildingBtn')?.addEventListener('click', () => {
        const button = document.getElementById('renameSelectedBuildingBtn');
        if (!button.disabled && state.selectedBuilding) {
            cancelMobileDragMode();
            showRenameModal(state.selectedBuilding);
        }
    });
    document.getElementById('deleteSelectedBuildingBtn')?.addEventListener('click', () => {
        const button = document.getElementById('deleteSelectedBuildingBtn');
        if (!button.disabled && state.selectedBuilding) {
            cancelMobileDragMode();
            deleteBuildingFromManager(state.selectedBuilding);
        }
    });

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            const wasMobile = document.body.classList.contains('mobile-view');
            checkScreenSize();
            const isNowMobile = document.body.classList.contains('mobile-view');
            if (isNowMobile !== wasMobile || isNowMobile) {
                initializeMobileInterface();
            }
        }, 200);
    });

    document.addEventListener('keydown', (e) => {
        const activeElement = document.activeElement;
        const isInputFocused = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');
        if ((e.key === 'Delete' || e.key === 'Backspace') && !isInputFocused && state.selectedBuilding) {
            cancelMobileDragMode();
            e.preventDefault();
            deleteBuildingFromManager(state.selectedBuilding);
        }
    });
}