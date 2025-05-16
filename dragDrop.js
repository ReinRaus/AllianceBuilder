import { buildingConfig } from './config.js';
import * as state from './state.js';
import { createBuilding, checkOverlap } from './buildingManager.js';
import { showPlayerNameModal } from './uiManager.js';

// Создает DOM-элемент призрака (здание и область)
function createGhostDOM(type, x, y) {
    const config = buildingConfig[type];
    if (!config) return { ghostEl: null, ghostAreaEl: null };

    // Корректировка позиции для правильного отображения призрака
    if (config.size > 1) {
        x = Math.max(0, Math.min(state.gridSize - config.size, x));
        y = Math.max(0, Math.min(state.gridSize - config.size, y));
    } else {
        x = Math.max(0, Math.min(state.gridSize - 1, x));
        y = Math.max(0, Math.min(state.gridSize - 1, y));
    }

    const ghostEl = document.createElement('div');
    ghostEl.className = 'building ghost-building';
    ghostEl.id = 'ghost-building'; // Уникальный ID для легкого удаления
    ghostEl.style.left = `${x * state.cellSize}px`;
    ghostEl.style.top = `${y * state.cellSize}px`;
    ghostEl.style.width = `${config.size * state.cellSize}px`;
    ghostEl.style.height = `${config.size * state.cellSize}px`;
    const icon = document.createElement('div');
    icon.textContent = config.icon;
    ghostEl.appendChild(icon);

    const hasOverlap = checkOverlap(x, y, config.size, config.size);
    ghostEl.classList.toggle('invalid-position', hasOverlap);

    let ghostAreaEl = null;
    if (config.areaSize > 0) {
        ghostAreaEl = document.createElement('div');
        ghostAreaEl.className = 'building-area ghost-area';
        ghostAreaEl.id = 'ghost-area'; // Уникальный ID
        const offset = Math.floor((config.areaSize - config.size) / 2);
        const areaX = x - offset;
        const areaY = y - offset;
        ghostAreaEl.style.left = `${areaX * state.cellSize}px`;
        ghostAreaEl.style.top = `${areaY * state.cellSize}px`;
        ghostAreaEl.style.width = `${config.areaSize * state.cellSize}px`;
        ghostAreaEl.style.height = `${config.areaSize * state.cellSize}px`;
    }
    return { ghostEl, ghostAreaEl, x, y, size: config.size, areaSize: config.areaSize };
}

// Обновляет (создает или перемещает) призрак на сетке
function updateGhostBuildingOnGrid(type, x, y) {
    removeGhostBuildingFromGrid(); // Сначала удаляем старый, если есть
    const grid = document.getElementById('grid');
    const { ghostEl, ghostAreaEl, ...ghostData } = createGhostDOM(type, x, y);

    if (ghostAreaEl) grid.appendChild(ghostAreaEl);
    if (ghostEl) grid.appendChild(ghostEl);

    if (ghostEl) {
        state.setGhostBuilding({ type, ...ghostData }); // Сохраняем данные о призраке в state
    } else {
        state.setGhostBuilding(null);
    }
}

// Удаляет призрак с сетки
function removeGhostBuildingFromGrid() {
    const ghostEl = document.getElementById('ghost-building');
    if (ghostEl) ghostEl.remove();
    const ghostArea = document.getElementById('ghost-area');
    if (ghostArea) ghostArea.remove();
    state.setGhostBuilding(null);
}

// Создание DOM-элемента для иконки-призрака у курсора
export function createCursorGhostIconDOM() {
    if (!state.cursorGhostIcon) { // Создаем только один раз
        const iconEl = document.createElement('div');
        iconEl.id = 'cursor-ghost-icon';
        document.body.appendChild(iconEl);
        state.setCursorGhostIcon(iconEl); // Сохраняем ссылку в state
    }
    if (state.cursorGhostIcon) state.cursorGhostIcon.style.display = 'none'; // Изначально скрыт
}

// Позиционирование иконки-призрака у курсора
function positionCursorGhostIcon(e) {
    if (state.cursorGhostIcon && state.cursorGhostIcon.style.display === 'block') {
        state.cursorGhostIcon.style.left = `${e.clientX + 10}px`;
        state.cursorGhostIcon.style.top = `${e.clientY + 10}px`;
    }
}

// Показывает иконку-призрак у курсора
function showCursorGhostIcon(iconText, e) {
    if (state.cursorGhostIcon) {
        state.cursorGhostIcon.textContent = iconText;
        state.cursorGhostIcon.style.display = 'block';
        positionCursorGhostIcon(e); // Сразу устанавливаем позицию
    }
}

// Скрывает иконку-призрак у курсора
function hideCursorGhostIcon() {
    if (state.cursorGhostIcon) {
        state.cursorGhostIcon.style.display = 'none';
    }
}

// Настройка перетаскивания
export function setupDragAndDrop() {
    const buildingItems = document.querySelectorAll('.building-item');
    const grid = document.getElementById('grid');
    const emptyDragImage = new Image();
    emptyDragImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

    let currentDraggedToolbarItem = null; // Для стилизации элемента в тулбаре
    let currentDragIconText = ''; // Текст для иконки у курсора

    // Глобальный обработчик для обновления позиции иконки-призрака
    const globalDragOverHandler = (e) => {
        if (state.draggedType) {
            positionCursorGhostIcon(e);
        }
    };

    buildingItems.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', item.dataset.type);
            e.dataTransfer.setDragImage(emptyDragImage, 0, 0); // Используем пустое изображение

            item.classList.add('dragging', 'dragging-source-transparent');
            state.setDraggedType(item.dataset.type);
            currentDraggedToolbarItem = item;
            currentDragIconText = buildingConfig[state.draggedType]?.icon || '❓';

            showCursorGhostIcon(currentDragIconText, e); // Показываем иконку у курсора
            document.addEventListener('dragover', globalDragOverHandler); // Начинаем отслеживать ее позицию
        });

        item.addEventListener('dragend', () => {
            if (currentDraggedToolbarItem) {
                currentDraggedToolbarItem.classList.remove('dragging', 'dragging-source-transparent');
            }
            removeGhostBuildingFromGrid(); // Убираем полный призрак с сетки
            hideCursorGhostIcon();        // Убираем иконку у курсора
            state.setDraggedType(null);
            currentDraggedToolbarItem = null;
            currentDragIconText = '';
            document.removeEventListener('dragover', globalDragOverHandler);
        });
    });

    grid.addEventListener('dragenter', (e) => {
        if (state.draggedType) {
            e.preventDefault();
            hideCursorGhostIcon(); // Скрываем маленькую иконку, т.к. сейчас будет полный призрак
        }
    });

    grid.addEventListener('dragover', (e) => {
        e.preventDefault(); // Обязательно для drop
        if (state.draggedType) {
            const rect = grid.getBoundingClientRect();
            const x = Math.floor((e.clientX - rect.left) / state.cellSize);
            const y = Math.floor((e.clientY - rect.top) / state.cellSize);
            updateGhostBuildingOnGrid(state.draggedType, x, y); // Показываем/обновляем ПОЛНЫЙ призрак
        }
    });

    grid.addEventListener('dragleave', (e) => {
        // Условие, чтобы призрак не исчезал при переходе на дочерние элементы внутри grid
        const gridRect = grid.getBoundingClientRect();
        if (state.draggedType &&
            (e.clientX <= gridRect.left || e.clientX >= gridRect.right ||
             e.clientY <= gridRect.top || e.clientY >= gridRect.bottom)) {
            removeGhostBuildingFromGrid();
            if (state.draggedType) { // Если все еще тащим (не было drop)
                showCursorGhostIcon(currentDragIconText, e); // Показываем маленькую иконку снова
            }
        }
    });

    grid.addEventListener('drop', (e) => {
        e.preventDefault();
        // Все призраки (и у курсора, и на сетке) будут убраны в 'dragend'
        const type = e.dataTransfer.getData('text/plain');
        const rect = grid.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / state.cellSize);
        const y = Math.floor((e.clientY - rect.top) / state.cellSize);

        if (type === 'castle') {
            // Определяем следующий номер для замка
            const castleCount = state.buildings.filter(b => b.type === 'castle').length;
            const defaultName = `${castleCount + 1}`;
            createBuilding(type, x, y, defaultName);
        } else if (type === 'deadzone') {
            // Для мертвой зоны имя по умолчанию пустое, или можно сделать как для замка
            // const deadzoneCount = state.buildings.filter(b => b.type === 'deadzone').length;
            // const defaultName = `Зона ${deadzoneCount + 1}`;
            createBuilding(type, x, y, ''); // Пустое имя по умолчанию для Deadzone
        } else {
            createBuilding(type, x, y);
        }
    });
}