import { buildingConfig, translations } from './config.js'; // translations импортирован, но не используется в этом файле. POTENTIAL_ISSUE: Лишний импорт?
import * as state from './state.js';
import { createBuilding, checkOverlap } from './buildingManager.js';
// showPlayerNameModal не используется после рефакторинга создания замка
// import { showPlayerNameModal } from './uiManager.js';

// --- Управление "призраком" здания на сетке ---

/**
 * Создает DOM-элементы для "призрака" здания и его области влияния.
 * @param {string} type Тип здания.
 * @param {number} x Координата X на сетке.
 * @param {number} y Координата Y на сетке.
 * @returns {object} Объект с DOM-элементами { ghostEl, ghostAreaEl } и данными призрака { x, y, size, areaSize }.
 */
function createGhostDOM(type, x, y) {
    const config = buildingConfig[type];
    if (!config) return { ghostEl: null, ghostAreaEl: null };

    // Корректировка позиции, чтобы призрак не выходил за пределы сетки
    const effectiveSize = config.size; // Для призрака всегда используем базовый размер
    x = Math.max(0, Math.min(state.gridSize - effectiveSize, x));
    y = Math.max(0, Math.min(state.gridSize - effectiveSize, y));

    // Создание основного элемента призрака
    const ghostEl = document.createElement('div');
    ghostEl.className = 'building ghost-building';
    ghostEl.id = 'ghost-building'; // ID для легкого удаления
    ghostEl.style.left = `${x * state.cellSize}px`;
    ghostEl.style.top = `${y * state.cellSize}px`;
    ghostEl.style.width = `${effectiveSize * state.cellSize}px`;
    ghostEl.style.height = `${effectiveSize * state.cellSize}px`;
    const icon = document.createElement('div');
    icon.className = 'icon';
    icon.textContent = config.icon;
    ghostEl.appendChild(icon);

    // Проверка на перекрытие и установка соответствующего класса
    const hasOverlap = checkOverlap(x, y, effectiveSize, effectiveSize);
    ghostEl.classList.toggle('invalid-position', hasOverlap);

    // Создание призрака области влияния, если она есть
    let ghostAreaEl = null;
    if (config.areaSize > 0) {
        ghostAreaEl = document.createElement('div');
        ghostAreaEl.className = 'building-area ghost-area';
        ghostAreaEl.id = 'ghost-area';
        const offset = Math.floor((config.areaSize - effectiveSize) / 2);
        ghostAreaEl.style.left = `${(x - offset) * state.cellSize}px`;
        ghostAreaEl.style.top = `${(y - offset) * state.cellSize}px`;
        ghostAreaEl.style.width = `${config.areaSize * state.cellSize}px`;
        ghostAreaEl.style.height = `${config.areaSize * state.cellSize}px`;
    }
    return { ghostEl, ghostAreaEl, x, y, size: effectiveSize, areaSize: config.areaSize };
}

/**
 * Обновляет (создает или перемещает) "призрак" здания на сетке.
 * @param {string} type Тип перетаскиваемого здания.
 * @param {number} x Координата X на сетке.
 * @param {number} y Координата Y на сетке.
 */
function updateGhostBuildingOnGrid(type, x, y) {
    removeGhostBuildingFromGrid(); // Удаляем предыдущий призрак, если он был
    const grid = document.getElementById('grid');
    const { ghostEl, ghostAreaEl, ...ghostData } = createGhostDOM(type, x, y);

    if (ghostAreaEl) grid.appendChild(ghostAreaEl);
    if (ghostEl) grid.appendChild(ghostEl);

    // Сохраняем информацию о текущем призраке в состоянии
    state.setGhostBuilding(ghostEl ? { type, ...ghostData } : null);
}

/** Удаляет "призрак" здания и его область с сетки. */
function removeGhostBuildingFromGrid() {
    const ghostEl = document.getElementById('ghost-building');
    if (ghostEl) ghostEl.remove();
    const ghostArea = document.getElementById('ghost-area');
    if (ghostArea) ghostArea.remove();
    state.setGhostBuilding(null); // Очищаем информацию о призраке в состоянии
}

// --- Управление иконкой-призраком у курсора ---

/** Создает DOM-элемент для иконки-призрака, следующей за курсором (если еще не создан). */
export function createCursorGhostIconDOM() {
    if (!state.cursorGhostIcon) {
        const iconEl = document.createElement('div');
        iconEl.id = 'cursor-ghost-icon';
        document.body.appendChild(iconEl);
        state.setCursorGhostIcon(iconEl); // Сохраняем ссылку на DOM-элемент в состоянии
    }
    if (state.cursorGhostIcon) state.cursorGhostIcon.style.display = 'none'; // Изначально скрыт
}

/**
 * Позиционирует иконку-призрак рядом с курсором.
 * @param {MouseEvent|DragEvent} e Событие мыши или перетаскивания.
 */
function positionCursorGhostIcon(e) {
    if (state.cursorGhostIcon && state.cursorGhostIcon.style.display === 'block') {
        // Смещаем иконку относительно курсора для лучшей видимости
        state.cursorGhostIcon.style.left = `${e.clientX + 10}px`;
        state.cursorGhostIcon.style.top = `${e.clientY + 10}px`;
    }
}

/**
 * Показывает иконку-призрак с указанным текстом (иконкой здания) и позиционирует ее.
 * @param {string} iconText Текст (иконка) для отображения.
 * @param {MouseEvent|DragEvent} e Событие для начального позиционирования.
 */
function showCursorGhostIcon(iconText, e) {
    if (state.cursorGhostIcon) {
        state.cursorGhostIcon.textContent = iconText;
        state.cursorGhostIcon.style.display = 'block';
        positionCursorGhostIcon(e);
    }
}

/** Скрывает иконку-призрак у курсора. */
function hideCursorGhostIcon() {
    if (state.cursorGhostIcon) {
        state.cursorGhostIcon.style.display = 'none';
    }
}

// --- Настройка логики Drag and Drop ---

/** Инициализирует обработчики событий для перетаскивания зданий с панели на сетку. */
export function setupDragAndDrop() {
    const buildingItems = document.querySelectorAll('.building-item'); // Элементы зданий на панели
    const grid = document.getElementById('grid'); // Основная сетка
    const emptyDragImage = new Image(); // Пустое изображение для кастомного вида перетаскивания
    emptyDragImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

    let currentDraggedToolbarItem = null; // Ссылка на перетаскиваемый элемент с панели (для стилизации)
    let currentDragIconText = '';       // Текст (иконка) для призрака у курсора

    // Глобальный обработчик для обновления позиции иконки-призрака во время перетаскивания
    const globalDragOverHandler = (e) => {
        if (state.draggedType) { // Если что-то активно перетаскивается
            positionCursorGhostIcon(e);
        }
    };

    buildingItems.forEach(item => {
        // Начало перетаскивания элемента с панели
        item.addEventListener('dragstart', (e) => {
            if (state.isGridRotated) { // Сброс поворота сетки, если он был активен
                state.setIsGridRotated(false);
                document.querySelector('.grid-container').classList.remove('rotated');
                // POTENTIAL_ISSUE: Нужно вызвать updateRotateButtonVisualState() из uiManager.
            }

            e.dataTransfer.setData('text/plain', item.dataset.type); // Сохраняем тип здания
            e.dataTransfer.setDragImage(emptyDragImage, 0, 0); // Используем невидимое изображение по умолчанию

            item.classList.add('dragging', 'dragging-source-transparent'); // Стилизация исходного элемента
            state.setDraggedType(item.dataset.type);
            currentDraggedToolbarItem = item;
            currentDragIconText = buildingConfig[state.draggedType]?.icon || '❓'; // Иконка для призрака

            showCursorGhostIcon(currentDragIconText, e); // Показываем иконку у курсора
            document.addEventListener('dragover', globalDragOverHandler); // Начинаем отслеживать ее позицию
        });

        // Завершение перетаскивания (успешное или нет)
        item.addEventListener('dragend', () => {
            if (currentDraggedToolbarItem) {
                currentDraggedToolbarItem.classList.remove('dragging', 'dragging-source-transparent');
            }
            removeGhostBuildingFromGrid(); // Убираем "полный" призрак с сетки
            hideCursorGhostIcon();         // Убираем иконку у курсора
            state.setDraggedType(null);    // Сбрасываем тип перетаскиваемого здания
            currentDraggedToolbarItem = null;
            currentDragIconText = '';
            document.removeEventListener('dragover', globalDragOverHandler);
        });
    });

    // Курсор входит на территорию сетки во время перетаскивания
    grid.addEventListener('dragenter', (e) => {
        if (state.draggedType) {
            e.preventDefault(); // Необходимо для события drop
            hideCursorGhostIcon(); // Скрываем маленькую иконку, т.к. будет показан "полный" призрак
        }
    });

    // Курсор перемещается над сеткой во время перетаскивания
    grid.addEventListener('dragover', (e) => {
        e.preventDefault(); // Необходимо для события drop
        if (state.draggedType) {
            const rect = grid.getBoundingClientRect();
            // Расчет координат ячейки под курсором
            const x = Math.floor((e.clientX - rect.left) / state.cellSize);
            const y = Math.floor((e.clientY - rect.top) / state.cellSize);
            updateGhostBuildingOnGrid(state.draggedType, x, y); // Обновляем "полный" призрак
        }
    });

    // Курсор покидает территорию сетки во время перетаскивания
    grid.addEventListener('dragleave', (e) => {
        const gridRect = grid.getBoundingClientRect();
        // Проверяем, что курсор действительно покинул сетку, а не перешел на дочерний элемент
        if (state.draggedType &&
            (e.clientX <= gridRect.left || e.clientX >= gridRect.right ||
             e.clientY <= gridRect.top || e.clientY >= gridRect.bottom)) {
            removeGhostBuildingFromGrid(); // Убираем "полный" призрак
            if (state.draggedType) { // Если все еще идет перетаскивание (не было drop)
                showCursorGhostIcon(currentDragIconText, e); // Показываем маленькую иконку снова
            }
        }
    });

    // Здание "брошено" на сетку
    grid.addEventListener('drop', (e) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('text/plain'); // Получаем тип здания
        if (!type) return; // Если тип не определен, ничего не делаем

        const rect = grid.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / state.cellSize);
        const y = Math.floor((e.clientY - rect.top) / state.cellSize);

        // Логика создания здания в зависимости от его типа
        if (type === 'castle') {
            const castleCount = state.buildings.filter(b => b.type === 'castle').length;
            // Используем translations для префикса имени замка, если он есть, или номер по умолчанию
            const prefix = translations[state.currentLang]?.defaultCastleNamePrefix || ""; // POTENTIAL_ISSUE: defaultCastleNamePrefix может быть не везде
            const defaultName = `${prefix}${castleCount + 1}`.trim();
            createBuilding(type, x, y, defaultName);
        } else if (type === 'deadzone') {
            createBuilding(type, x, y, ''); // Мертвая зона по умолчанию без имени
        } else {
            createBuilding(type, x, y); // Для остальных зданий имя не требуется
        }
        // Призраки будут автоматически убраны в событии 'dragend'
    });
}
