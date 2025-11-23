// config.js
// Этот модуль содержит статическую конфигурацию приложения,
// включая строки для локализации интерфейса и параметры различных типов зданий.

/**
 * Объект с переводами интерфейса на разные языки.
 * Ключи верхнего уровня - стандартные коды языков (ISO 639-1, возможно с регионом).
 * Внутренние ключи - идентификаторы строк, используемые в коде для получения локализованного текста.
 * Рекомендуется поддерживать консистентность ключей во всех языковых объектах.
 */
export const translations = {
    ru: {
        title: "Планировщик зданий альянса",
        buildingsHeader: "Здания",              // Заголовок панели выбора зданий
        buildingsListHeader: "Список зданий",     // Заголовок списка размещенных зданий
        modalTitle: "Имя игрока",             // Заголовок модального окна для ввода имени (по умолчанию для замка)
        renameModalTitle: "Переименовать замок",  // Заголовок модального окна при переименовании (по умолчанию для замка)
        renameDeadZoneModalTitle: "Название зоны", // Заголовок модального для DeadZone (создание/переименование)
        deadZoneNamePlaceholder: "Введите название зоны", // Плейсхолдер для DeadZone

        gridSizeLabel: "Размер сетки:",
        apply: "Применить",
        save: "Сохранить",                   // Общий текст для кнопок "Сохранить" в модальных окнах

        // Типы зданий
        fortress: "Крепость альянса",
        outpost: "Форпост альянса",
        hellgates: "Адские врата",
        hospital: "Госпиталь",
        farm: "Ферма",
        warehouse: "Склад",
        castle: "Замок игрока",
        deadzone: "Мертвая зона",

        // Действия и состояния
        rename: "Переименовать",
        delete: "Удалить",
        playerName: "Имя игрока",             // Плейсхолдер для инпута имени игрока (для замка)
        shareLink: "Поделиться ссылкой",      // Текст для кнопки "Поделиться состоянием"
        rotateGrid: "Повернуть сетку",
        resetRotation: "Сбросить поворот",
        distanceToHGLabel: "До Адских Врат",
        averageDistance: "Среднее расстояние",
        hellgatesNotPlaced: "Врата не размещены", // Сообщение, если Адские Врата не на сетке
        cannotShiftFurther: "Невозможно сдвинуть здания дальше.", // Сообщение при попытке сдвинуть за пределы
        limitReached: "лимит достигнут",       // Общее сообщение о достижении лимита (добавляется к типу здания)
        cannotOverlapMsg: "Здания не могут перекрываться!", // Сообщение о невозможности разместить из-за перекрытия
        invalidGridSize: "Размер сетки должен быть от 10 до 100.",
        linkCopied: "Ссылка скопирована в буфер обмена!",
        linkCopyFailed: "Не удалось скопировать ссылку автоматически. Вот ваша ссылка:", // Дополняется URL
        saveError: "Ошибка при сохранении состояния.",
        loadError: "Ошибка загрузки состояния из ссылки.",
        loadErrorCorrupted: "Ошибка загрузки: данные повреждены или неизвестный формат.",

        // Для мобильного интерфейса
        controlsHeader: "Управление",
        languageHeader: "Язык",
        defaultCastleNamePrefix: "Замок #", // Префикс для имени замка по умолчанию, # будет заменен на номер
    },
    en: {
        title: "Alliance Buildings Planner",
        buildingsHeader: "Buildings",
        buildingsListHeader: "Buildings List",
        modalTitle: "Player Name",
        renameModalTitle: "Rename Castle",
        renameDeadZoneModalTitle: "Zone Name",
        deadZoneNamePlaceholder: "Enter zone name",

        gridSizeLabel: "Grid Size:",
        apply: "Apply",
        save: "Save",

        fortress: "Alliance Fortress",
        outpost: "Alliance Outpost",
        hellgates: "Hell Gates",
        hospital: "Hospital",
        farm: "Farm",
        warehouse: "Warehouse",
        castle: "Player Castle",
        deadzone: "Dead Zone",

        rename: "Rename",
        delete: "Delete",
        playerName: "Player Name",
        shareLink: "Share Link",
        rotateGrid: "Rotate Grid",
        resetRotation: "Reset Rotation",
        distanceToHGLabel: "To Hell Gates",
        averageDistance: "Average Distance",
        hellgatesNotPlaced: "Gates not placed",
        cannotShiftFurther: "Cannot shift buildings further.",
        limitReached: "limit reached",
        cannotOverlapMsg: "Buildings cannot overlap!",
        invalidGridSize: "Grid size must be between 10 and 100.",
        linkCopied: "Link copied to clipboard!",
        linkCopyFailed: "Failed to copy link automatically. Here is your link:",
        saveError: "Error saving state.",
        loadError: "Error loading state from link.",
        loadErrorCorrupted: "Load error: data corrupted or unknown format.",

        controlsHeader: "Controls",
        languageHeader: "Language",
        defaultCastleNamePrefix: "Castle #",
    },
    pt_br: { // Португальский (Бразилия)
        title: "Planejador de Construções da Aliança",
        buildingsHeader: "Construções",
        buildingsListHeader: "Lista de Construções",
        modalTitle: "Nome do Jogador",
        renameModalTitle: "Renomear Castelo",
        renameDeadZoneModalTitle: "Nome da Zona",
        deadZoneNamePlaceholder: "Digite o nome da zona",

        gridSizeLabel: "Tamanho da Grade:",
        apply: "Aplicar",
        save: "Salvar",

        fortress: "Fortaleza da Aliança",
        outpost: "Posto Avançado da Aliança",
        hellgates: "Portões Infernais",
        hospital: "Hospital",
        farm: "Fazenda",
        warehouse: "Armazém",
        castle: "Castelo do Jogador",
        deadzone: "Zona Morta",

        rename: "Renomear",
        delete: "Excluir",
        playerName: "Nome do Jogador",
        shareLink: "Compartilhar Link",
        rotateGrid: "Girar Grade",
        resetRotation: "Resetar Rotação",
        distanceToHGLabel: "Aos Portões Infernais",
        averageDistance: "Distância Média",
        hellgatesNotPlaced: "Portões não colocados",
        cannotShiftFurther: "Não é possível mover mais as construções.",
        limitReached: "limite atingido",
        cannotOverlapMsg: "As construções não podem se sobrepor!",
        invalidGridSize: "O tamanho da grade deve ser entre 10 e 100.",
        linkCopied: "Link copiado para a área de transferência!",
        linkCopyFailed: "Falha ao copiar o link automaticamente. Aqui está o seu link:",
        saveError: "Erro ao salvar o estado.",
        loadError: "Erro ao carregar o estado do link.",
        loadErrorCorrupted: "Erro ao carregar: dados corrompidos ou formato desconhecido.",

        controlsHeader: "Controles",
        languageHeader: "Idioma",
        defaultCastleNamePrefix: "Castelo #",
    },
    de: { // Немецкий
        title: "Allianz Gebäudeplaner",
        buildingsHeader: "Gebäude",
        buildingsListHeader: "Gebäudeliste",
        modalTitle: "Spielername",
        renameModalTitle: "Burg umbenennen",
        renameDeadZoneModalTitle: "Zonenname",
        deadZoneNamePlaceholder: "Zonennamen eingeben",

        gridSizeLabel: "Rastergröße:",
        apply: "Anwenden",
        save: "Speichern",

        fortress: "Allianzfestung",
        outpost: "Außenposten der Allianz",
        hellgates: "Höllentore",
        hospital: "Krankenhaus",
        farm: "Farm",
        warehouse: "Lagerhaus",
        castle: "Spielerburg",
        deadzone: "Todeszone",

        rename: "Umbenennen",
        delete: "Löschen",
        playerName: "Spielername",
        shareLink: "Link teilen",
        rotateGrid: "Raster drehen",
        resetRotation: "Drehung zurücksetzen",
        distanceToHGLabel: "Zu den Höllentoren",
        averageDistance: "Durchschnittsentfernung",
        hellgatesNotPlaced: "Tore nicht platziert",
        cannotShiftFurther: "Gebäude können nicht weiter verschoben werden.",
        limitReached: "Limit erreicht",
        cannotOverlapMsg: "Gebäude dürfen sich nicht überlappen!",
        invalidGridSize: "Rastergröße muss zwischen 10 und 100 liegen.",
        linkCopied: "Link in die Zwischenablage kopiert!",
        linkCopyFailed: "Link konnte nicht automatisch kopiert werden. Hier ist Ihr Link:",
        saveError: "Fehler beim Speichern des Zustands.",
        loadError: "Fehler beim Laden des Zustands vom Link.",
        loadErrorCorrupted: "Ladefehler: Daten beschädigt oder unbekanntes Format.",

        controlsHeader: "Steuerung",
        languageHeader: "Sprache",
        defaultCastleNamePrefix: "Burg #",
    }
};

/**
 * Конфигурация для каждого типа зданий.
 * Определяет их визуальное представление (иконка), размеры на сетке,
 * область влияния, лимиты на количество, принадлежность к типу (альянс, игрок, специальное)
 * и цвет фона для особых типов (например, `deadzone`).
 */
export const buildingConfig = {
    fortress:  { icon: '🏰', size: 3, areaSize: 15, limit: 1,  type: 'alliance' },
    outpost:   { icon: '🚩', size: 2, areaSize: 10, limit: 5,  type: 'alliance' },
    hellgates: { icon: '👹', size: 3, areaSize: 0,  limit: 1,  type: 'alliance' },
    hospital:  { icon: '🏥', size: 2, areaSize: 0,  limit: 1,  type: 'alliance' },
    farm:      { icon: '🌾', size: 2, areaSize: 0,  limit: 1,  type: 'alliance' },
    warehouse: { icon: '🏭', size: 2, areaSize: 0,  limit: 1,  type: 'alliance' },
    castle:    { icon: '🏯', size: 2, areaSize: 0,  limit: -1, type: 'player' },   // limit: -1 означает отсутствие лимита
    deadzone:  { icon: '⚠️', size: 1, areaSize: 0,  limit: -1, type: 'special', bgcolor: 'rgba(144, 238, 144, 0.35)' } // Уменьшил alpha для фона
};