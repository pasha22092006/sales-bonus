/**
 * Функция для расчета прибыли
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase) {
    const { discount, sale_price, quantity } = purchase;
    const discountCoefficient = discount / 100;
    const discountedPrice = sale_price * (1 - discountCoefficient);
    const revenue = discountedPrice * quantity;
    return revenue; // Убрано промежуточное округление
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;
    if (index === total - 1) return 0;
    
    let bonusPercentage;
    if (index === 0) {
      bonusPercentage = 0.15;
    } else if (index <= 2) {
      bonusPercentage = 0.1;
    } else {
      bonusPercentage = 0.05;
    }
    
    // Округляем промежуточный результат
    return parseFloat((profit * bonusPercentage).toFixed(6));
  }

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 

// /**
//  * Анализирует данные о продажах и формирует отчёт по продавцам
//  * @param {Object} data - Входные данные (продавцы, товары, покупки)
//  * @param {Object} options - Настройки расчётов
//  * @param {Function} options.calculateRevenue - Функция расчёта выручки
//  * @param {Function} options.calculateBonus - Функция расчёта бонусов
//  * @returns {Array} Отчёт по продавцам
//  */
function analyzeSalesData(data, options) {
    // === 1. Проверка входных данных ===
    if (!data || typeof data !== 'object') {
        throw new Error('Не переданы данные для анализа');
    }
    
    const requiredCollections = ['sellers', 'products', 'purchase_records'];
    for (const collection of requiredCollections) {
        if (!Array.isArray(data[collection])) {
            throw new Error(`Некорректная структура данных: отсутствует или неверный формат ${collection}`);
        }
        if (data[collection].length === 0) {
            throw new Error(`Пустой массив: ${collection}`);
        }
    }

    // 2. Создаём индексы
    const productsMap = data.products.reduce((map, product) => {
        map[product.sku] = product;
        return map;
    }, {});

    // 3. Инициализируем структуру для продавцов
    const sellersMap = data.sellers.reduce((map, seller) => {
        map[seller.id] = {
            id: seller.id,
            name: `${seller.first_name} ${seller.last_name}`,
            revenue: 0,
            profit: 0,
            sales_count: 0,
            products_sold: {}
        };
        return map;
    }, {});

    // 4. Обрабатываем каждую запись о продаже
    data.purchase_records.forEach(purchase => {
        const seller = sellersMap[purchase.seller_id];
        if (!seller) return;

        seller.sales_count++;
        
        purchase.items.forEach(item => {
            // Расчёт выручки
            const itemRevenue = options.calculateRevenue(item, productsMap[item.sku]);
            seller.revenue += itemRevenue;

            // Расчёт прибыли (если есть данные о товаре)
            const product = productsMap[item.sku];
            if (product) {
                const itemCost = product.purchase_price * item.quantity;
                seller.profit += (itemRevenue - itemCost);
            }

            // Учёт проданных товаров
            seller.products_sold[item.sku] = 
                (seller.products_sold[item.sku] || 0) + item.quantity;
        });
    });

    // 5. Преобразуем в массив и сортируем по прибыли
    const sortedSellers = Object.values(sellersMap).sort((a, b) => b.profit - a.profit);

    // 6. Формируем итоговый отчёт
    return sortedSellers.map((seller, index) => {
        // Получаем топ-10 товаров
        const topProducts = Object.entries(seller.products_sold)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([sku, quantity]) => ({ sku, quantity }));

        // Рассчитываем бонус с промежуточным округлением
        const rawBonus = options.calculateBonus(index, sortedSellers.length, seller);
        const bonus = Math.round(rawBonus * 100) / 100;

        return {
            seller_id: seller.id,
            name: seller.name,
            revenue: parseFloat(seller.revenue.toFixed(2)), // Округление до 2 знаков
            profit: parseFloat(seller.profit.toFixed(2)),
            sales_count: seller.sales_count,
            top_products: topProducts,
            bonus: bonus
        };
    });
}