import { translations, buildingConfig } from './config.js';
import * as state from './state.js';
import { selectBuilding, deleteBuilding, updateBuilding } from './buildingManager.js'; // createBuilding вызывается из app.js или dragDrop.js

// Показ модального окна для ввода имени игрока/названия зоны
export function showPlayerNameModal(x, y, type = 'castle') { // type по умолчанию castle
    const modal = document.getElementById('playerNameModal');
    modal.dataset.x = x;
    modal.dataset.y = y;
    modal.dataset.buildingType = type; // Сохраняем тип здания

    // Обновляем заголовок модального окна в зависимости от типа
    const modalTitleEl = modal.querySelector('#modal-title'); // Находим заголовок внутри модалки
    if (type === 'deadzone') {
        modalTitleEl.textContent = state.currentLang === 'ru' ? "Название мертвой зоны" : "Dead Zone Name";
    } else { // castle
        modalTitleEl.textContent = translations[state.currentLang].modalTitle;
    }
    document.getElementById('playerNameInput').value = ''; // Очищаем инпут
    document.getElementById('playerNameInput').placeholder = translations[state.currentLang].playerName;


    modal.style.display = 'block';
    document.getElementById('playerNameInput').focus();
}

// Показ модального окна для переименования
export function showRenameModal(buildingId) {
    const building = state.buildings.find(b => b.id === buildingId);
    if (!building) return;

    const modal = document.getElementById('renameModal');
    modal.dataset.buildingId = buildingId;
    document.getElementById('renameInput').value = building.playerName || '';

    // Обновляем заголовок модального окна в зависимости от типа
    const renameModalTitleEl = modal.querySelector('#rename-modal-title');
    if (building.type === 'deadzone') {
        renameModalTitleEl.textContent = state.currentLang === 'ru' ? "Переименовать мертвую зону" : "Rename Dead Zone";
    } else { // castle
        renameModalTitleEl.textContent = translations[state.currentLang].renameModalTitle;
    }

    modal.style.display = 'block';
    document.getElementById('renameInput').focus();
}

// Обновление списка зданий
export function updateBuildingsList() {
    const listContainer = document.getElementById('buildings-list');
    listContainer.innerHTML = '';

    const sortedBuildings = [...state.buildings].sort((a, b) => {
        const configA = buildingConfig[a.type];
        const configB = buildingConfig[b.type];
        if (configA.type === 'alliance' && configB.type !== 'alliance') return -1;
        if (configA.type !== 'alliance' && configB.type === 'alliance') return 1;
        if ((a.type === 'castle' || a.type === 'deadzone') && (b.type === 'castle' || b.type === 'deadzone')) {
            return (a.playerName || '').localeCompare(b.playerName || '');
        }
        // Можно добавить сортировку по типу, если нужно
        return (translations[state.currentLang][a.type] || a.type)
               .localeCompare(translations[state.currentLang][b.type] || b.type);
    });

    sortedBuildings.forEach(building => {
        const listItem = document.createElement('div');
        listItem.className = 'list-item';
        listItem.id = `list-item-${building.id}`;
        if (state.selectedBuilding === building.id) {
            listItem.classList.add('selected');
        }

        const info = document.createElement('div');
        info.innerHTML = `${building.icon} ${translations[state.currentLang][building.type]}`;
        if ((building.type === 'castle' || building.type === 'deadzone') && building.playerName) {
            info.innerHTML += `: ${building.playerName}`;
        }

        const actions = document.createElement('div');
        if (building.type === 'castle' || building.type === 'deadzone') {
            const renameBtn = document.createElement('button');
            renameBtn.textContent = translations[state.currentLang].rename;
            renameBtn.addEventListener('click', () => showRenameModal(building.id));
            actions.appendChild(renameBtn);
        }
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = translations[state.currentLang].delete;
        deleteBtn.addEventListener('click', () => deleteBuilding(building.id));
        actions.appendChild(deleteBtn);

        listItem.appendChild(info);
        listItem.appendChild(actions);
        listItem.addEventListener('click', (e) => {
            if (!e.target.closest('button')) { // Не обрабатывать клик, если он был на кнопке
                selectBuilding(building.id);
            }
        });
        listContainer.appendChild(listItem);
    });
}

// Обновление языка интерфейса
export function updateLanguage() {
    document.getElementById('title').textContent = translations[state.currentLang].title;
    document.title = translations[state.currentLang].title;
    document.getElementById('buildings-header').textContent = translations[state.currentLang].buildingsHeader;
    document.getElementById('buildings-list-header').textContent = translations[state.currentLang].buildingsListHeader;
    
    // Обновляем заголовки модалок только если они видимы или по ключу, если есть data-key
    const modalTitleEl = document.getElementById('modal-title');
    if (modalTitleEl) modalTitleEl.textContent = translations[state.currentLang].modalTitle; // Общий случай
    
    const renameModalTitleEl = document.getElementById('rename-modal-title');
    if (renameModalTitleEl) renameModalTitleEl.textContent = translations[state.currentLang].renameModalTitle; // Общий случай

    document.querySelectorAll('[data-key]').forEach(el => {
        const key = el.getAttribute('data-key');
        if (translations[state.currentLang][key]) {
            // Для инпутов меняем placeholder, для остального textContent
            if (el.tagName === 'INPUT' && key === 'playerName') { // Конкретный случай для playerNameInput
                 el.placeholder = translations[state.currentLang][key];
            } else {
                 el.textContent = translations[state.currentLang][key];
            }
        }
    });
    document.querySelectorAll('.building-name').forEach(el => { // Названия зданий в тулбаре
        const key = el.getAttribute('data-key');
        if (translations[state.currentLang][key]) {
            el.textContent = translations[state.currentLang][key];
        }
    });
    document.getElementById('grid-size-label').textContent = translations[state.currentLang].gridSizeLabel;
    // document.getElementById('playerNameInput').placeholder = translations[state.currentLang].playerName; // Уже обработано через data-key
    document.getElementById('saveButton').textContent = translations[state.currentLang].saveButton;

    // Обновление текста кнопки поворота
    const rotateButton = document.getElementById('rotateGridButton');
    if (rotateButton) {
        const key = state.isGridRotated ? 'resetRotation' : 'rotateGrid';
        rotateButton.textContent = translations[state.currentLang][key] || key;
    }
    
    // Обновление текста кнопки "До адских врат" (если data-key используется)
    // она уже должна обновляться через querySelectorAll('[data-key]')

    // Если режим расстояний активен, обновить отображение с новым языком
    if (state.showDistanceToHG) {
        // Нужен доступ к updateCastleDistanceDisplay.
        // Либо передать как колбэк, либо импортировать из app.js (что создаст цикл).
        // Проще всего, если updateCastleDistanceDisplay будет сама знать о currentLang.
        // Она уже использует translations[state.currentLang], так что это ок.
        // Просто вызовем её из app.js после updateLanguage если режим активен.
        // Или, как вариант, updateCastleDistanceDisplay может быть в uiManager.js
        // Но она сильно завязана на логику зданий.
        // Пока оставим вызов из app.js или при toggleDistanceToHGMode.
    }

    updateBuildingsList(); // Перерисовать список с новыми названиями
    checkScreenSize(); // Применить правила для мобильной версии (скрыть/показать текст)
}

export function updateCastleDistanceDisplay() {
    const hellGates = state.buildings.find(b => b.type === 'hellgates');

    state.buildings.forEach(building => {
        if (building.type === 'castle') {
            const buildingEl = document.getElementById(`building-${building.id}`);
            if (!buildingEl) return;

            let nameEl = buildingEl.querySelector('.player-castle-name');
            if (!nameEl) {
                nameEl = document.createElement('div');
                nameEl.className = 'player-castle-name';
                const iconEl = buildingEl.querySelector('.icon'); // Иконка замка обычно не показывается, но на всякий случай
                if (iconEl) {
                    iconEl.insertAdjacentElement('afterend', nameEl);
                } else {
                    buildingEl.appendChild(nameEl);
                }
            }

            if (state.showDistanceToHG) {
                if (hellGates) {
                    const castleCenterX = building.x + building.size / 2;
                    const castleCenterY = building.y + building.size / 2;
                    const hgCenterX = hellGates.x + hellGates.size / 2;
                    const hgCenterY = hellGates.y + hellGates.size / 2;

                    const distance = Math.sqrt(
                        Math.pow(castleCenterX - hgCenterX, 2) +
                        Math.pow(castleCenterY - hgCenterY, 2)
                    );
                    nameEl.textContent = `${distance.toFixed(1)} ${translations[state.currentLang].distanceUnit}`;
                } else {
                    nameEl.textContent = translations[state.currentLang].hellgatesNotPlaced;
                }
            } else {
                nameEl.textContent = building.playerName || '';
            }
        }
        // Можно добавить логику для других зданий, если потребуется
    });
}

export function updateRotateButtonVisualState() { // Только визуальное состояние
    const rotateButton = document.getElementById('rotateGridButton');
    if (rotateButton) {
        const key = state.isGridRotated ? 'resetRotation' : 'rotateGrid';
        rotateButton.textContent = translations[state.currentLang][key] || key; // Обновляем текст из-за языка
        rotateButton.classList.toggle('active', state.isGridRotated);
    }
}

export function updateDistanceToHGButtonVisualState() { // Только визуальное состояние
    const distanceButton = document.getElementById('distanceToHGButton');
    if (distanceButton) {
        distanceButton.classList.toggle('active', state.showDistanceToHG);
    }
}

// Адаптация под размер экрана
export function checkScreenSize() {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    document.body.classList.toggle('mobile-view', isMobile);

    document.querySelectorAll('.building-item .building-name').forEach(nameEl => {
        const key = nameEl.getAttribute('data-key');
        if (isMobile) {
            // Сохраняем оригинальный текст, если еще не сохранен
            if (!nameEl.dataset.originalText && translations[state.currentLang][key]) {
                nameEl.dataset.originalText = translations[state.currentLang][key];
            }
            // На мобильных текст скрывается через CSS, но можно и тут: nameEl.style.display = 'none';
        } else {
            // Восстанавливаем текст, если он был сохранен
            if (nameEl.dataset.originalText) {
                nameEl.textContent = nameEl.dataset.originalText;
            } else if (translations[state.currentLang][key]) { // Если не было сохранено, берем из translations
                nameEl.textContent = translations[state.currentLang][key];
            }
            // nameEl.style.display = ''; // Показывается через CSS
        }
    });
}