const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const sales = await prisma.sale.findMany({
        where: { createdAt: { gte: startOfDay }, status: 'COMPLETED' },
        include: { items: true }
    });

    const expenses = await prisma.expense.findMany({
        where: { expenseDate: { gte: startOfDay }, paymentStatus: 'PAID' }
    });

    console.log('SALES_COUNT:', sales.length);
    sales.forEach(s => {
        console.log(`Sale ${s.saleNumber}: Total=${s.totalAmount}`);
        s.items.forEach(i => {
            console.log(`  Item: Qty=${i.quantity}, Unit Price=${i.unitPrice}, Cost Price=${i.costPrice}`);
        });
    });

    console.log('EXPENSES_COUNT:', expenses.length);
    expenses.forEach(e => {
        console.log(`Expense: Amount=${e.amount}, Desc=${e.description}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
