function preciseRound(value, precision = 2) {
    const factor = 10 ** precision;
    return Math.round((value + Number.EPSILON) * factor) / factor;
}

function calculateSimpleRevenue(purchase) {
    const { discount, sale_price, quantity } = purchase;
    const discountCoefficient = discount / 100;
    const discountedPrice = sale_price * (1 - discountCoefficient);
    return discountedPrice * quantity;
}

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

    // Главное изменение — округляем вниз до 2 знаков после запятой
    return Math.floor(profit * bonusPercentage * 100) / 100;
}

function analyzeSalesData(data, options) {
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

    const productsMap = data.products.reduce((map, product) => {
        map[product.sku] = product;
        return map;
    }, {});

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

    data.purchase_records.forEach(purchase => {
        const seller = sellersMap[purchase.seller_id];
        if (!seller) return;

        seller.sales_count++;

        purchase.items.forEach(item => {
            const itemRevenue = options.calculateRevenue(item);
            seller.revenue += preciseRound(itemRevenue); // <-- вот здесь ключевая правка!
        
            const product = productsMap[item.sku];
            if (product) {
                const itemCost = product.purchase_price * item.quantity;
                seller.profit += (itemRevenue - itemCost);
            }
        
            seller.products_sold[item.sku] =
                (seller.products_sold[item.sku] || 0) + item.quantity;
        });
    });

    const sortedSellers = Object.values(sellersMap).sort((a, b) => b.profit - a.profit);

    return sortedSellers.map((seller, index) => {
        const topProducts = Object.entries(seller.products_sold)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([sku, quantity]) => ({ sku, quantity }));

        const rawBonus = options.calculateBonus(index, sortedSellers.length, {
            ...seller,
            profit: preciseRound(seller.profit)
        });

        const bonus = preciseRound(rawBonus);

        return {
            seller_id: seller.id,
            name: seller.name,
            revenue: preciseRound(seller.revenue),
            profit: preciseRound(seller.profit),
            sales_count: seller.sales_count,
            top_products: topProducts,
            bonus: bonus
        };
    });
}
