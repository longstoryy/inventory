import prisma from "@/lib/prisma-optimized";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function TransferDetailsPage({ params }: { params: { id: string } }) {
    const transfer = await prisma.transfer.findUnique({
        where: { id: params.id },
        include: { items: true }
    });

    if (!transfer) return notFound();

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <Link href="/transfers" className="text-sm text-gray-500 hover:underline mb-2 block">&larr; Back to Transfers</Link>
                    <h1 className="text-2xl font-bold">Transfer #{transfer.id.slice(0, 8)}</h1>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">Print Manifest</Button>
                    {transfer.status === 'PENDING' && <Button>Complete Transfer</Button>}
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Details</h3>
                </div>
                <div className="p-6 grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Status</p>
                        <p className="mt-1 text-sm text-gray-900">{transfer.status}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Date</p>
                        <p className="mt-1 text-sm text-gray-900">{new Date(transfer.date).toLocaleDateString()}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Items</h3>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {transfer.items.map((item: any) => (
                            <tr key={item.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.sku}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
