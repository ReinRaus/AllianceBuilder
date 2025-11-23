// dragDrop.js
// Этот модуль отвечает за логику перетаскивания (Drag and Drop) зданий
// с панели инструментов на сетку (для десктопных устройств) и за управление
// различными "призраками" зданий (как для десктопа, так и для мобильных).

import { buildingConfig, translations } from './config.js'; // Конфигурация зданий для получения иконок, размеров и т.д.
import * as state from './state.js'; // Глобальное состояние для draggedType, cellSize, gridSize и т.д.
import { createBuilding, checkOverlap } from './buildingManager.js'; // Функции для создания зданий и проверки перекрытий
import { updateRotateButtonVisualState } from './uiManager.js'; // Для сброса поворота сетки

// --- Управление "полным призраком" здания на сетке ---
// Этот призрак отображается непосредственно на сетке во время перетаскивания,
// показывая, где будет размещено здание. Используется как для десктопного D&D,
// так и для мобильной эмуляции D&D.

/**
 * Создает DOM-элементы для "полного призрака" здания и его области влияния (если есть).
 * @param {string} type - Тип здания (ключ из `buildingConfig`).
 * @param {number} x - Координата X на сетке (в ячейках).
 * @param {number} y - Координата Y на сетке (в ячейках).
 * @returns {object} Объект, содержащий { ghostEl, ghostAreaEl, x, y, size, areaSize } или { null, null } при ошибке.
 */
function createFullGhostDOM(type, x, y) { // Переименована для ясности (была createGhostDOM)
    const config = buildingConfig[type];
    if (!config) {
        console.error(`[dragDrop] createFullGhostDOM: Конфигурация для типа '${type}' не найдена.`);
        return { ghostEl: null, ghostAreaEl: null };
    }

    const effectiveSize = config.size; // Для призрака всегда используется базовый размер

    // Корректировка координат, чтобы призрак не выходил за пределы сетки
    x = Math.max(0, Math.min(state.gridSize - effectiveSize, x));
    y = Math.max(0, Math.min(state.gridSize - effectiveSize, y));

    // Создание основного DOM-элемента призрака
    const ghostEl = document.createElement('div');
    ghostEl.className = 'building ghost-building'; // Общие классы для стилизации
    ghostEl.id = 'full-ghost-building'; // Уникальный ID для этого типа призрака
    ghostEl.style.left = `${x * state.cellSize}px`;
    ghostEl.style.top = `${y * state.cellSize}px`;
    ghostEl.style.width = `${effectiveSize * state.cellSize}px`;
    ghostEl.style.height = `${effectiveSize * state.cellSize}px`;

    const iconEl = document.createElement('div');
    iconEl.className = 'icon'; // Класс для возможной стилизации иконки внутри призрака
    iconEl.textContent = config.icon;
    ghostEl.appendChild(iconEl);

    // Проверка на перекрытие с уже существующими зданиями
    const hasOverlap = checkOverlap(x, y, effectiveSize, effectiveSize);
    ghostEl.classList.toggle('invalid-position', hasOverlap); // Класс для визуальной индикации невалидной позиции

    // Создание DOM-элемента для призрака области влияния (если она есть у здания)
    let ghostAreaEl = null;
    if (config.areaSize > 0) {
        ghostAreaEl = document.createElement('div');
        ghostAreaEl.className = 'building-area ghost-area';
        ghostAreaEl.id = 'full-ghost-area'; // Уникальный ID
        const offset = Math.floor((config.areaSize - effectiveSize) / 2); // Центрирование области
        ghostAreaEl.style.left = `${(x - offset) * state.cellSize}px`;
        ghostAreaEl.style.top = `${(y - offset) * state.cellSize}px`;
        ghostAreaEl.style.width = `${config.areaSize * state.cellSize}px`;
        ghostAreaEl.style.height = `${config.areaSize * state.cellSize}px`;
    }
    return { ghostEl, ghostAreaEl, x, y, size: effectiveSize, areaSize: config.areaSize };
}

/**
 * Обновляет (создает или перемещает) "полный призрак" здания на сетке.
 * @param {string} type - Тип перетаскиваемого здания.
 * @param {number} x - Координата X на сетке.
 * @param {number} y - Координата Y на сетке.
 */
export function updateFullGhostOnGrid(type, x, y) {
    removeFullGhostFromGrid(); // Удаляем предыдущий, если был
    const grid = document.getElementById('grid');
    if (!grid) return;

    const { ghostEl, ghostAreaEl, ...ghostData } = createFullGhostDOM(type, x, y);

    if (ghostAreaEl) grid.appendChild(ghostAreaEl);
    if (ghostEl) grid.appendChild(ghostEl);

    // Сохраняем данные о текущем "полном призраке" в глобальном состоянии
    // (используется, например, для проверки `invalid-position` в других частях логики, если нужно)
    state.setGhostBuilding(ghostEl ? { type, ...ghostData } : null);
}

/** Удаляет "полный призрак" здания и его область с сетки. */
export function removeFullGhostFromGrid() {
    document.getElementById('full-ghost-building')?.remove();
    document.getElementById('full-ghost-area')?.remove();
    state.setGhostBuilding(null); // Очищаем данные о призраке в состоянии
}


// --- Управление иконкой-призраком у курсора (для десктопного Drag-and-Drop) ---
// Этот призрак - маленькая иконка, следующая за курсором мыши во время D&D.

/** Создает DOM-элемент для иконки-призрака у курсора (однократно). */
export function createCursorGhostIconDOM() {
    if (!state.cursorGhostIcon) { // Создаем только если еще не существует
        const iconEl = document.createElement('div');
        iconEl.id = 'cursor-ghost-icon'; // Для стилизации
        document.body.appendChild(iconEl);
        state.setCursorGhostIcon(iconEl); // Сохраняем ссылку в состоянии
    }
    if (state.cursorGhostIcon) state.cursorGhostIcon.style.display = 'none'; // Изначально скрыт
}

/**
 * Позиционирует иконку-призрак рядом с курсором мыши.
 * @param {MouseEvent|DragEvent} e - Событие мыши или перетаскивания.
 */
function positionCursorGhostIcon(e) {
    if (state.cursorGhostIcon && state.cursorGhostIcon.style.display === 'block') {
        // Небольшое смещение от курсора, чтобы иконка не перекрывала сам курсор
        state.cursorGhostIcon.style.left = `${e.clientX + 10}px`;
        state.cursorGhostIcon.style.top = `${e.clientY + 10}px`;
    }
}

/**
 * Показывает иконку-призрак у курсора с указанным текстом (иконкой здания).
 * @param {string} iconText - Текст (обычно иконка) для отображения.
 * @param {MouseEvent|DragEvent} e - Событие для начального позиционирования.
 */
function showCursorGhostIcon(iconText, e) {
    if (state.cursorGhostIcon) {
        state.cursorGhostIcon.textContent = iconText;
        state.cursorGhostIcon.style.display = 'block';
        positionCursorGhostIcon(e); // Сразу устанавливаем позицию
    }
}

/** Скрывает иконку-призрак у курсора. */
function hideCursorGhostIcon() {
    if (state.cursorGhostIcon) {
        state.cursorGhostIcon.style.display = 'none';
    }
}


// --- Управление призраком для мобильного размещения (следует за пальцем) ---
// Этот призрак - маленькая иконка, следующая за пальцем при эмуляции D&D на мобильных.

let mobilePlacementGhost = null; // DOM-элемент для мобильного призрака (локальная переменная модуля)

/** Создает DOM-элемент для мобильного призрака (однократно). */
export function createMobilePlacementGhostDOM() {
    if (!mobilePlacementGhost) {
        mobilePlacementGhost = document.createElement('div');
        mobilePlacementGhost.id = 'mobile-placement-ghost'; // Для стилизации
        mobilePlacementGhost.style.position = 'fixed'; // Фиксированное позиционирование относительно viewport
        mobilePlacementGhost.style.zIndex = '2000';     // Выше большинства элементов
        mobilePlacementGhost.style.pointerEvents = 'none'; // Не должен перехватывать события касания
        mobilePlacementGhost.style.display = 'none';   // Изначально скрыт
        document.body.appendChild(mobilePlacementGhost);
    }
}

/**
 * Показывает и наполняет мобильный призрак иконкой выбранного здания.
 * @param {string} buildingType - Тип выбранного здания.
 */
export function showMobilePlacementGhost(buildingType) {
    if (!mobilePlacementGhost) createMobilePlacementGhostDOM(); // Гарантируем, что элемент создан

    const config = buildingConfig[buildingType];
    if (config && mobilePlacementGhost) {
        mobilePlacementGhost.textContent = config.icon; // Устанавливаем иконку
        mobilePlacementGhost.style.display = 'block';
        // Начальное позиционирование произойдет при первом событии touchmove
    }
}

/**
 * Позиционирует мобильный призрак рядом с точкой касания.
 * @param {TouchEvent} e - Событие касания (touchmove или touchstart).
 */
export function positionMobilePlacementGhost(e) {
    if (mobilePlacementGhost && mobilePlacementGhost.style.display === 'block' && e.touches && e.touches.length > 0) {
        const touch = e.touches[0]; // Используем первое активное касание
        // Смещение от точки касания для лучшей видимости
        mobilePlacementGhost.style.left = `${touch.clientX + 15}px`;
        mobilePlacementGhost.style.top = `${touch.clientY + 15}px`;
    } else if (mobilePlacementGhost && mobilePlacementGhost.style.display === 'block' && e.clientX !== undefined) {
        // Fallback для событий мыши (например, при отладке мобильного режима в десктопном браузере)
        mobilePlacementGhost.style.left = `${e.clientX + 15}px`;
        mobilePlacementGhost.style.top = `${e.clientY + 15}px`;
    }
}

/** Скрывает мобильный призрак. */
export function hideMobilePlacementGhost() {
    if (mobilePlacementGhost) {
        mobilePlacementGhost.style.display = 'none';
    }
}


// --- Настройка стандартного HTML5 Drag and Drop (для десктопа) ---

/** Инициализирует обработчики событий для перетаскивания зданий с панели на сетку (десктоп). */
export function setupDragAndDrop() {
    const buildingItems = document.querySelectorAll('.toolbar .building-item'); // Элементы в десктопном тулбаре
    const grid = document.getElementById('grid');
    if (!grid || buildingItems.length === 0) return; // Если нет сетки или элементов для D&D

    // Пустое изображение используется для dataTransfer.setDragImage,
    // чтобы скрыть стандартный "призрак" браузера, так как мы используем свой (#cursor-ghost-icon).
    const emptyDragImage = new Image();
    emptyDragImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

    let currentDraggedToolbarItem = null; // Ссылка на элемент, который перетаскивается с тулбара
    let currentDragIconText = '';       // Иконка для #cursor-ghost-icon

    // Глобальный обработчик для обновления позиции #cursor-ghost-icon
    const globalDragOverHandler = (e) => {
        if (state.draggedType) { // Только если идет D&D с панели
            positionCursorGhostIcon(e);
        }
    };

    buildingItems.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            if (state.isGridRotated) { // Автоматический сброс поворота сетки
                state.setIsGridRotated(false);
                document.querySelector('.grid-container')?.classList.remove('rotated');
                updateRotateButtonVisualState(); // Обновить UI кнопки поворота
            }

            const type = item.dataset.type;
            if (!type || !buildingConfig[type]) return; // Проверка на валидный тип

            e.dataTransfer.setData('text/plain', type);
            e.dataTransfer.setDragImage(emptyDragImage, 0, 0); // Используем "невидимый" drag image

            item.classList.add('dragging', 'dragging-source-transparent'); // Стилизация исходного элемента
            state.setDraggedType(type); // Устанавливаем тип перетаскиваемого здания в состояние
            currentDraggedToolbarItem = item;
            currentDragIconText = buildingConfig[type].icon || '❓';

            showCursorGhostIcon(currentDragIconText, e); // Показываем наш кастомный призрак у курсора
            document.addEventListener('dragover', globalDragOverHandler); // Начинаем отслеживать его позицию
        });

        item.addEventListener('dragend', () => {
            // Очистка после завершения D&D (успешного или отмененного)
            currentDraggedToolbarItem?.classList.remove('dragging', 'dragging-source-transparent');
            removeFullGhostFromGrid();    // Убираем "полный призрак" с сетки
            hideCursorGhostIcon();        // Убираем призрак у курсора
            state.setDraggedType(null);   // Сбрасываем тип в состоянии
            currentDraggedToolbarItem = null;
            currentDragIconText = '';
            document.removeEventListener('dragover', globalDragOverHandler);
        });
    });

    // Обработчики на самой сетке (#grid)
    grid.addEventListener('dragenter', (e) => {
        if (state.draggedType) { // Если перетаскивается что-то с нашей панели
            e.preventDefault();   // Необходимо для разрешения 'drop'
            hideCursorGhostIcon(); // Скрываем маленький призрак, т.к. сейчас будет показан полный на сетке
        }
    });

    grid.addEventListener('dragover', (e) => {
        if (state.draggedType) {
            e.preventDefault(); // Необходимо для 'drop'
            const rect = grid.getBoundingClientRect();
            const x = Math.floor((e.clientX - rect.left) / state.cellSize);
            const y = Math.floor((e.clientY - rect.top) / state.cellSize);
            updateFullGhostOnGrid(state.draggedType, x, y); // Показываем/обновляем "полный призрак" на сетке
        }
    });

    grid.addEventListener('dragleave', (e) => {
        // Проверка, что курсор действительно покинул сетку, а не перешел на дочерний элемент (например, призрак)
        const gridRect = grid.getBoundingClientRect();
        if (state.draggedType &&
            (e.clientX <= gridRect.left || e.clientX >= gridRect.right ||
             e.clientY <= gridRect.top || e.clientY >= gridRect.bottom)) {
            removeFullGhostFromGrid();    // Убираем полный призрак
            if (state.draggedType) { // Если D&D все еще активно (не было drop/dragend)
                showCursorGhostIcon(currentDragIconText, e); // Показываем маленький призрак у курсора снова
            }
        }
    });

    grid.addEventListener('drop', (e) => {
        e.preventDefault(); // Предотвращаем стандартное действие браузера
        const type = e.dataTransfer.getData('text/plain');
        if (!type || !state.draggedType || type !== state.draggedType) { // Проверка, что это наш D&D
            removeFullGhostFromGrid(); // Убираем призрак на всякий случай
            return;
        }

        const rect = grid.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / state.cellSize);
        const y = Math.floor((e.clientY - rect.top) / state.cellSize);

        // Логика создания здания (идентична мобильной версии, можно вынести в общую функцию, если будет усложняться)
        const config = buildingConfig[type];
        if (config && !checkOverlap(x, y, config.size, config.size)) { // Проверка на перекрытие перед созданием
            if (type === 'castle') {
                const castleCount = state.buildings.filter(b => b.type === 'castle').length;
                const prefix = translations[state.currentLang]?.defaultCastleNamePrefix?.replace('#', '') || "";
                const defaultName = `${prefix}${castleCount + 1}`.trim();
                createBuilding(type, x, y, defaultName);
            } else if (type === 'deadzone') {
                createBuilding(type, x, y, ''); // Мертвая зона по умолчанию без имени
            } else {
                createBuilding(type, x, y);
            }
        } else {
             alert(translations[state.currentLang]?.cannotOverlapMsg || "Cannot place building here.");
        }
        // Призраки (#cursor-ghost-icon и #full-ghost-building) будут убраны в 'dragend'
    });
}