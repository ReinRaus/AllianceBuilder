import { translations, buildingConfig } from './config.js';
import * as state from './state.js';
// Функции из buildingManager, которые вызываются из UI (например, при клике на кнопки в списке)
import { selectBuilding, deleteBuilding, updateBuilding as updateBuildingDataAndDOM } from './buildingManager.js';
// POTENTIAL_ISSUE: createBuilding вызывается из app.js (playerNameModal) и dragDrop.js. Не здесь.

// --- Управление модальными окнами ---

/**
 * Показывает модальное окно для ввода имени игрока или названия мертвой зоны.
 * @param {number} x Координата X для создаваемого здания.
 * @param {number} y Координата Y для создаваемого здания.
 * @param {string} [type='castle'] Тип создаваемого здания ('castle' или 'deadzone').
 */
export function showPlayerNameModal(x, y, type = 'castle') {
    const modal = document.getElementById('playerNameModal');
    modal.dataset.x = x; // Сохраняем координаты в data-атрибутах для последующего использования
    modal.dataset.y = y;
    modal.dataset.buildingType = type;

    const modalTitleEl = modal.querySelector('#modal-title');
    const playerNameInputEl = document.getElementById('playerNameInput');

    // Настройка заголовка и плейсхолдера в зависимости от типа здания и языка
    if (type === 'deadzone') {
        modalTitleEl.textContent = translations[state.currentLang].renameDeadZoneModalTitle || // POTENTIAL_ISSUE: Ключа нет
                                   (state.currentLang === 'ru' ? "Название мертвой зоны" : "Dead Zone Name");
        playerNameInputEl.placeholder = translations[state.currentLang].deadZoneNamePlaceholder || // POTENTIAL_ISSUE: Ключа нет
                                        (state.currentLang === 'ru' ? "Введите название зоны" : "Enter zone name");
    } else { // 'castle'
        modalTitleEl.textContent = translations[state.currentLang].modalTitle;
        playerNameInputEl.placeholder = translations[state.currentLang].playerName;
    }
    playerNameInputEl.value = ''; // Очистка поля ввода
    modal.style.display = 'block';
    playerNameInputEl.focus(); // Фокус на поле ввода
}

/**
 * Показывает модальное окно для переименования существующего замка или мертвой зоны.
 * @param {string} buildingId ID здания для переименования.
 */
export function showRenameModal(buildingId) {
    const building = state.buildings.find(b => b.id === buildingId);
    if (!building) return;

    const modal = document.getElementById('renameModal');
    modal.dataset.buildingId = buildingId; // Сохраняем ID для кнопки "Сохранить"

    const renameInputEl = document.getElementById('renameInput');
    renameInputEl.value = building.playerName || ''; // Заполняем текущим именем

    const renameModalTitleEl = modal.querySelector('#rename-modal-title');
    // Настройка заголовка в зависимости от типа здания
    if (building.type === 'deadzone') {
        renameModalTitleEl.textContent = translations[state.currentLang].renameDeadZoneModalTitle || // POTENTIAL_ISSUE: Ключа нет
                                           (state.currentLang === 'ru' ? "Переименовать мертвую зону" : "Rename Dead Zone");
    } else { // 'castle'
        renameModalTitleEl.textContent = translations[state.currentLang].renameModalTitle;
    }
    modal.style.display = 'block';
    renameInputEl.focus();
}

// --- Обновление элементов интерфейса ---

/** Обновляет список размещенных зданий в соответствующей панели. */
export function updateBuildingsList() {
    const listContainer = document.getElementById('buildings-list');
    listContainer.innerHTML = ''; // Очистка старого списка

    // Сортировка зданий: сначала альянсовые, потом замки/зоны по имени, затем остальные по типу
    const sortedBuildings = [...state.buildings].sort((a, b) => {
        const configA = buildingConfig[a.type];
        const configB = buildingConfig[b.type];

        // Альянсовые здания всегда сверху
        if (configA.type === 'alliance' && configB.type !== 'alliance') return -1;
        if (configA.type !== 'alliance' && configB.type === 'alliance') return 1;

        // Замки и мертвые зоны сортируются по имени
        const isSortableByNameA = a.type === 'castle' || a.type === 'deadzone';
        const isSortableByNameB = b.type === 'castle' || b.type === 'deadzone';
        if (isSortableByNameA && isSortableByNameB) {
            return (a.playerName || '').localeCompare(b.playerName || '');
        }
        if (isSortableByNameA) return -1; // Замки/зоны выше остальных (не альянсовых)
        if (isSortableByNameB) return 1;

        // Сортировка остальных по локализованному имени типа
        return (translations[state.currentLang][a.type] || a.type)
               .localeCompare(translations[state.currentLang][b.type] || b.type);
    });

    sortedBuildings.forEach(building => {
        const listItem = document.createElement('div');
        listItem.className = 'list-item';
        listItem.id = `list-item-${building.id}`;
        if (state.selectedBuilding === building.id) {
            listItem.classList.add('selected'); // Подсветка выделенного элемента
        }

        // Информация о здании (иконка, тип, имя)
        const info = document.createElement('div');
        info.innerHTML = `${building.icon} ${translations[state.currentLang][building.type] || building.type}`;
        if ((building.type === 'castle' || building.type === 'deadzone') && building.playerName) {
            info.innerHTML += `: ${building.playerName}`;
        }

        // Кнопки действий (переименовать, удалить)
        const actions = document.createElement('div');
        actions.className = 'list-item-actions'; // Добавлен класс для возможной стилизации

        if (building.type === 'castle' || building.type === 'deadzone') {
            const renameBtn = document.createElement('button');
            renameBtn.textContent = translations[state.currentLang].rename;
            renameBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Предотвратить выделение элемента списка по клику на кнопку
                showRenameModal(building.id);
            });
            actions.appendChild(renameBtn);
        }

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = translations[state.currentLang].delete;
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteBuilding(building.id); // Вызов функции из buildingManager
        });
        actions.appendChild(deleteBtn);

        listItem.appendChild(info);
        listItem.appendChild(actions);

        // Выделение здания по клику на элемент списка (не на кнопки внутри него)
        listItem.addEventListener('click', () => {
            selectBuilding(building.id); // Вызов функции из buildingManager
        });
        listContainer.appendChild(listItem);
    });
}

/** Обновляет текстовое содержимое элементов интерфейса в соответствии с текущим языком. */
export function updateLanguage() {
    document.title = translations[state.currentLang].title; // Заголовок вкладки браузера
    // Обновление всех элементов с атрибутом data-key
    document.querySelectorAll('[data-key]').forEach(el => {
        const key = el.getAttribute('data-key');
        if (translations[state.currentLang][key]) {
            if (el.tagName === 'INPUT' && el.placeholder !== undefined) { // Для инпутов обновляем плейсхолдер
                el.placeholder = translations[state.currentLang][key];
            } else { // Для остальных элементов - textContent
                el.textContent = translations[state.currentLang][key];
            }
        }
    });

    // Отдельно обновляем названия зданий в панели инструментов (т.к. они не имеют общего data-key для группы)
    document.querySelectorAll('.toolbar .building-item .building-name').forEach(el => {
        const buildingTypeKey = el.dataset.key; // Предполагаем, что data-key здесь - это тип здания
        if (translations[state.currentLang][buildingTypeKey]) {
            el.textContent = translations[state.currentLang][buildingTypeKey];
        }
    });

    updateBuildingsList(); // Перерисовать список зданий с новыми локализованными именами
    checkScreenSize();     // Применить адаптивные стили (например, скрытие текста на мобильных)

    // Обновляем визуальное состояние кнопок, зависящих от языка
    updateRotateButtonVisualState();
    // updateDistanceToHGButtonVisualState(); // Текст этой кнопки не меняется, только data-key и класс active

    // Если активен режим отображения расстояний, нужно обновить текст на замках
    if (state.showDistanceToHG) {
        updateCastleDistanceDisplay();
    }
}

/** Обновляет отображение информации на замках (имя или расстояние до Адских Врат). */
export function updateCastleDistanceDisplay() {
    const hellGates = state.buildings.find(b => b.type === 'hellgates');

    state.buildings.forEach(building => {
        if (building.type === 'castle') {
            const buildingEl = document.getElementById(`building-${building.id}`);
            if (!buildingEl) return;

            let nameEl = buildingEl.querySelector('.player-castle-name');
            // Если элемент для имени еще не создан (например, замок был без имени), создаем его
            if (!nameEl) {
                nameEl = document.createElement('div');
                nameEl.className = 'player-castle-name';
                buildingEl.appendChild(nameEl); // Просто добавляем в конец, т.к. у замка нет явной иконки в DOM
            }

            if (state.showDistanceToHG) { // Если включен режим отображения расстояний
                if (hellGates) {
                    // Расчет расстояния между центрами замка и Адских Врат
                    const castleCenterX = building.x + building.size / 2;
                    const castleCenterY = building.y + building.size / 2;
                    const hgCenterX = hellGates.x + hellGates.size / 2;
                    const hgCenterY = hellGates.y + hellGates.size / 2;

                    const distance = Math.sqrt(
                        Math.pow(castleCenterX - hgCenterX, 2) +
                        Math.pow(castleCenterY - hgCenterY, 2)
                    );
                    // Отображаем расстояние с одной цифрой после запятой и единицей измерения
                    nameEl.textContent = `${distance.toFixed(1)} ${translations[state.currentLang].distanceUnit}`;
                } else {
                    // Если Адские Врата не размещены
                    nameEl.textContent = translations[state.currentLang].hellgatesNotPlaced;
                }
            } else { // Если режим расстояний выключен, отображаем обычное имя замка
                nameEl.textContent = building.playerName || '';
            }
        }
    });
}

/** Обновляет визуальное состояние кнопки поворота сетки (текст и класс 'active'). */
export function updateRotateButtonVisualState() {
    const rotateButton = document.getElementById('rotateGridButton');
    if (rotateButton) {
        const key = state.isGridRotated ? 'resetRotation' : 'rotateGrid';
        // Обновляем текст кнопки в соответствии с текущим состоянием и языком
        rotateButton.textContent = translations[state.currentLang][key] || key;
        rotateButton.classList.toggle('active', state.isGridRotated);
    }
}

/** Обновляет визуальное состояние кнопки режима "До Адских Врат" (класс 'active'). */
export function updateDistanceToHGButtonVisualState() {
    const distanceButton = document.getElementById('distanceToHGButton');
    if (distanceButton) {
        distanceButton.classList.toggle('active', state.showDistanceToHG);
    }
}

/**
 * Адаптирует интерфейс под размер экрана (например, для мобильных устройств).
 * Скрывает/показывает текстовые названия зданий в панели инструментов.
 */
export function checkScreenSize() {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    document.body.classList.toggle('mobile-view', isMobile); // Добавляем/удаляем класс для body

    // Адаптация отображения имен зданий в тулбаре
    document.querySelectorAll('.toolbar .building-item .building-name').forEach(nameEl => {
        const key = nameEl.dataset.key; // Тип здания из data-key
        if (isMobile) {
            // На мобильных устройствах имя обычно скрывается через CSS,
            // но здесь можно сохранить оригинальный текст, если он будет показан в другом месте (например, tooltip)
            if (!nameEl.dataset.originalText && translations[state.currentLang][key]) {
                nameEl.dataset.originalText = translations[state.currentLang][key];
            }
            // CSS: .mobile-view .toolbar .building-item .building-name { display: none; }
        } else {
            // На десктопе восстанавливаем текст (если он был изменен или скрыт)
            if (nameEl.dataset.originalText) {
                nameEl.textContent = nameEl.dataset.originalText;
            } else if (translations[state.currentLang][key]) {
                nameEl.textContent = translations[state.currentLang][key];
            }
        }
    });
}