// translations.js
// Объект для хранения всех локализованных строк приложения.
// Доступ к переводам осуществляется через window.appTranslations.t(key, currentLanguage, replacements).

/**
 * Вспомогательная функция для получения перевода.
 * Ищет перевод по ключу для указанного языка. Если не найден, пытается использовать fallback-язык.
 * Если и fallback не найден, возвращает строку-ошибку с ключом.
 * @param {object} allTranslationsData - Объект со всеми переводами (this.data из appTranslations).
 * @param {string} key - Ключ строки для перевода.
 * @param {string} lang - Код текущего языка (например, 'ru', 'en').
 * @param {string} [fallbackLang='en'] - Резервный язык.
 * @returns {string} Локализованная строка или сообщение об ошибке.
 */
const getTranslationHelperInternal = (allTranslationsData, key, lang, fallbackLang = 'en') => {
    if (allTranslationsData && allTranslationsData[key] && allTranslationsData[key][lang] !== undefined) {
        return allTranslationsData[key][lang];
    }
    if (allTranslationsData && allTranslationsData[key] && allTranslationsData[key][fallbackLang] !== undefined) {
        // console.warn(`[Translations] Для ключа '${key}' не найден перевод на '${lang}'. Используется fallback '${fallbackLang}'.`);
        return allTranslationsData[key][fallbackLang];
    }
    // Если ключ вообще отсутствует в allTranslationsData, это тоже ошибка.
    if (!allTranslationsData || !allTranslationsData[key]) {
         console.error(`[Translations] Ключ '${key}' НЕ НАЙДЕН в объекте переводов.`);
    } else {
        console.error(`[Translations] Для ключа '${key}' НЕ НАЙДЕН перевод на '${lang}' и fallback '${fallbackLang}'.`);
    }
    return `KEY_NOT_FOUND:_${key}`; // Возвращаем ключ, чтобы было видно проблему в UI
};

// Глобальный объект window.appTranslations будет содержать сами переводы и метод t().
window.appTranslations = {
    // Непосредственно данные переводов: ключ_строки -> код_языка -> перевод
data: {
        // --- Общие ---
        title: {
            ru: "Планировщик зданий альянса", en: "Alliance Buildings Planner",
            de: "Allianz Gebäudeplaner", pt_br: "Planejador de Construções da Aliança"
        },
        apply: {
            ru: "Применить", en: "Apply", de: "Anwenden", pt_br: "Aplicar"
        },
        save: {
            ru: "Сохранить", en: "Save", de: "Speichern", pt_br: "Salvar"
        },
        closeModalLabel: { 
            ru: "Закрыть модальное окно", en: "Close modal", de: "Modal schließen", pt_br: "Fechar modal"
        },
        loading: { 
            ru: "Загрузка...", en: "Loading...", de: "Laden...", pt_br: "Carregando..."
        },
        enterNameLabel: { // <-- НОВЫЙ КЛЮЧ
            ru: "Введите имя", en: "Enter Name", de: "Name eingeben", pt_br: "Digite o Nome"
        },
        namePlaceholder: { // <-- НОВЫЙ КЛЮЧ
            ru: "Имя", en: "Name", de: "Name", pt_br: "Nome"
        },
        renameGenericTitle: { // <-- НОВЫЙ КЛЮЧ
            ru: "Переименовать элемент", en: "Rename Item", de: "Element umbenennen", pt_br: "Renomear Item"
        },

        // --- Хедер и сайдбар ---
        shareLink: {
            ru: "Поделиться ссылкой", en: "Share Link", de: "Link teilen", pt_br: "Compartilhar Link"
        },
        gridSizeLabel: {
            ru: "Размер сетки:", en: "Grid Size:", de: "Rastergröße:", pt_br: "Tamanho da Grade:"
        },
        rotateGrid:    { ru: "Повернуть сетку", en: "Rotate Grid", de: "Raster drehen", pt_br: "Girar Grade" },
        resetRotation: { ru: "Сбросить поворот", en: "Reset Rotation", de: "Drehung zurücksetzen", pt_br: "Resetar Rotação" },
        distanceToHGLabel: { ru: "До Адских Врат", en: "To Hell Gates", de: "Zu den Höllentoren", pt_br: "Aos Portões Infernais" },
        averageDistance: { ru: "Среднее расстояние", en: "Average Distance", de: "Durchschnittsentfernung", pt_br: "Distância Média" },
        openMenuLabel: { 
            ru: "Открыть меню", en: "Open menu", de: "Menü öffnen", pt_br: "Abrir menu"
        },
        closeSidebarLabel: { 
            ru: "Закрыть меню", en: "Close menu", de: "Menü schließen", pt_br: "Fechar menu"
        },
        controlsHeader: { ru: "Управление", en: "Controls", de: "Steuerung", pt_br: "Controles" },
        languageHeader: { ru: "Язык", en: "Language", de: "Sprache", pt_br: "Idioma" },

        // --- Панель инструментов (тулбар) ---
        buildingsHeader: { 
            ru: "Здания", en: "Buildings", de: "Gebäude", pt_br: "Construções"
        },
        shiftUpTitle:    { ru: "Сдвинуть все вверх", en: "Shift all up", de: "Alle nach oben verschieben", pt_br: "Mover tudo para cima" },
        shiftDownTitle:  { ru: "Сдвинуть все вниз", en: "Shift all down", de: "Alle nach unten verschieben", pt_br: "Mover tudo para baixo" },
        shiftLeftTitle:  { ru: "Сдвинуть все влево", en: "Shift all left", de: "Alle nach links verschieben", pt_br: "Mover tudo para esquerda" },
        shiftRightTitle: { ru: "Сдвинуть все вправо", en: "Shift all right", de: "Alle nach rechts verschieben", pt_br: "Mover tudo para direita" },
        cancelSelection: { 
            ru: "Отменить", en: "Cancel", de: "Abbrechen", pt_br: "Cancelar"
        },

        // --- Типы зданий ---
        fortress:  { ru: "Крепость альянса", en: "Alliance Fortress", de: "Allianzfestung", pt_br: "Fortaleza da Aliança" },
        outpost:   { ru: "Форпост альянса", en: "Alliance Outpost", de: "Außenposten der Allianz", pt_br: "Posto Avançado da Aliança" },
        hellgates: { ru: "Адские врата", en: "Hell Gates", de: "Höllentore", pt_br: "Portões Infernais" },
        hospital:  { ru: "Госпиталь", en: "Hospital", de: "Krankenhaus", pt_br: "Hospital" },
        farm:      { ru: "Ферма", en: "Farm", de: "Farm", pt_br: "Fazenda" },
        warehouse: { ru: "Склад", en: "Warehouse", de: "Lagerhaus", pt_br: "Armazém" },
        castle:    { ru: "Замок игрока", en: "Player Castle", de: "Spielerburg", pt_br: "Castelo do Jogador" },
        deadzone:  { ru: "Мертвая зона", en: "Dead Zone", de: "Todeszone", pt_br: "Zona Morta" },

        // --- Модальные окна и действия над зданиями ---
        modalTitle: { 
            ru: "Имя игрока", en: "Player Name", de: "Spielername", pt_br: "Nome do Jogador"
        },
        playerName: { 
            ru: "Имя игрока", en: "Player Name", de: "Spielername", pt_br: "Nome do Jogador"
        },
        renameModalTitle: { 
            ru: "Переименовать замок", en: "Rename Castle", de: "Burg umbenennen", pt_br: "Renomear Castelo"
        },
        renameDeadZoneModalTitle: { 
            ru: "Название зоны", en: "Zone Name", de: "Zonenname", pt_br: "Nome da Zona"
        },
        deadZoneNamePlaceholder: { 
            ru: "Введите название зоны", en: "Enter zone name", de: "Zonennamen eingeben", pt_br: "Digite o nome da zona"
        },
        rename: { ru: "Переименовать", en: "Rename", de: "Umbenennen", pt_br: "Renomear" },
        delete: { ru: "Удалить", en: "Delete", de: "Löschen", pt_br: "Excluir" },
        renameNotAvailable: { ru: "Переименование недоступно", en: "Rename not available", de: "Umbenennen nicht verfügbar", pt_br: "Renomear não disponível" },
        confirmDeleteBuilding: { ru: "Удалить это здание?", en: "Delete this building?", de: "Dieses Gebäude löschen?", pt_br: "Excluir esta construção?" },
        confirmDeleteNamedBuilding: { ru: "Удалить «%NAME%»?", en: "Delete '%NAME%'?", de: "'%NAME%' löschen?", pt_br: "Excluir '%NAME%'?" }, 
        selectedBuildingActionsLabel: { 
            ru: "Действия с выделенным зданием", en: "Actions for selected building", de: "Aktionen für ausgewähltes Gebäude", pt_br: "Ações para construção selecionada"
        },

        // --- Сообщения и уведомления ---
        hellgatesNotPlaced: { ru: "Врата не размещены", en: "Gates not placed", de: "Tore nicht platziert", pt_br: "Portões não colocados" },
        cannotShiftFurther: { ru: "Невозможно сдвинуть здания дальше.", en: "Cannot shift buildings further.", de: "Gebäude können nicht weiter verschoben werden.", pt_br: "Não é possível mover mais as construções." },
        limitReached:     { ru: "лимит достигнут", en: "limit reached", de: "Limit erreicht", pt_br: "limite atingido" },
        cannotOverlapMsg: { ru: "Здания не могут перекрываться!", en: "Buildings cannot overlap!", de: "Gebäude dürfen sich nicht überlappen!", pt_br: "As construções não podem se sobrepor!" },
        invalidGridSize:  { ru: "Размер сетки должен быть от 10 до 100.", en: "Grid size must be between 10 and 100.", de: "Rastergröße muss zwischen 10 und 100 liegen.", pt_br: "O tamanho da grade deve ser entre 10 e 100." },
        linkCopied:       { ru: "Ссылка скопирована в буфер обмена!", en: "Link copied to clipboard!", de: "Link in die Zwischenablage kopiert!", pt_br: "Link copiado para a área de transferência!" },
        linkCopyFailed:   { ru: "Не удалось скопировать ссылку автоматически. Ваша ссылка:", en: "Failed to copy link automatically. Here is your link:", de: "Link konnte nicht automatisch kopiert werden. Ihr Link:", pt_br: "Falha ao copiar o link automaticamente. Seu link:" },
        saveError:        { ru: "Ошибка при сохранении состояния.", en: "Error saving state.", de: "Fehler beim Speichern des Zustands.", pt_br: "Erro ao salvar o estado." },
        loadError:        { ru: "Ошибка загрузки состояния из ссылки.", en: "Error loading state from link.", de: "Fehler beim Laden des Zustands vom Link.", pt_br: "Erro ao carregar o estado do link." },
        loadErrorCorrupted: { ru: "Ошибка загрузки: данные повреждены или неизвестный формат.", en: "Load error: data corrupted or unknown format.", de: "Ladefehler: Daten beschädigt oder unbekanntes Format.", pt_br: "Erro ao carregar: dados corrompidos ou formato desconhecido." },
        defaultCastleNamePrefix: { 
            ru: "Замок #", en: "Castle #", de: "Burg #", pt_br: "Castelo #"
        }
    },
    
    /**
     * Функция-хелпер для получения локализованной строки.
     * Реализация этой функции находится в App.js (внутри LanguageContext),
     * но для единообразия и возможности вызова window.appTranslations.t() напрямую,
     * она здесь также определена (или может вызывать внутренний хелпер).
     * @param {string} key - Ключ строки перевода.
     * @param {string} lang - Код текущего языка (передается из App.js или LanguageContext).
     * @param {string} [fallbackLang='en'] - Резервный язык.
     * @returns {string} Локализованная строка или сообщение об ошибке.
     */
    t: function(key, lang, fallbackLang = 'en') { // При вызове lang будет передан из LanguageContext.t
        return getTranslationHelperInternal(this.data, key, lang, fallbackLang);
    }
};