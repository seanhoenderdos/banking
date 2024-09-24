import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { transactionCategoryStyles } from "@/constants";
import {
  cn,
  formatAmount,
  formatDateTime,
  getTransactionStatus,
  removeSpecialCharacters,
} from "@/lib/utils";

const CategoryBadge = ({ category }: CategoryBadgeProps) => {
  const {
    borderColor,
    backgroundColor,
    textColor,
    chipBackgroundColor,
  } = transactionCategoryStyles[category as keyof typeof transactionCategoryStyles] || transactionCategoryStyles.default;

  return (
    <div className={cn("category-badge", borderColor, chipBackgroundColor)}>
      <div className={cn("size-2 rounded-full", backgroundColor)} />
      <p className={cn("text-[12px] font-medium", textColor)}>{category}</p>
    </div>
  );
};

const TransactionsTable = ({ transactions }: TransactionTableProps) => {
  return (
    <Table>
      <TableHeader className="bg-[#f9fafb]">
        <TableRow>
          <TableHead className="px-2">Transaction</TableHead>
          <TableHead className="px-2">Amount</TableHead>
          <TableHead className="px-2">Status</TableHead>
          <TableHead className="px-2">Date</TableHead>
          <TableHead className="px-2 max-md:hidden">Channel</TableHead>
          <TableHead className="px-2 max-md:hidden">Category</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((t: Transaction) => {
          // Determine if it's a debit or credit transaction
          const isDebit = t.type === "debit" || t.amount < 0;
          const isCredit = t.type === "credit";
          const amount = formatAmount(t.amount);

          // Log transaction data for debugging
          console.log(
            `Transaction: ${t.name}, Type: ${t.type}, Amount: ${t.amount}, IsDebit: ${isDebit}, IsCredit: ${isCredit}`
          );

          return (
            <TableRow
              key={t.id}
              className={`${isDebit ? "bg-[#FFFBFA]" : "bg-[#F6FEF9]"} hover:bg-none border-b`}
            >
              <TableCell className="pl-4 pr-4">
                <div className="flex items-center gap-3">
                  <h1 className="truncate font-semibold text-gray-700">
                    {removeSpecialCharacters(t.name)}
                  </h1>
                </div>
              </TableCell>

              <TableCell
                className={`pl-4 pr-4 font-semibold ${
                  isDebit ? "text-red-600" : "text-green-600"
                }`}
              >
                {isDebit ? `-${amount}` : amount}
              </TableCell>

              <TableCell className="pl-4 pr-4">
                <CategoryBadge category={getTransactionStatus(new Date(t.date))} />
              </TableCell>

              <TableCell className="pl-4 pr-4">
                {formatDateTime(new Date(t.date)).dateTime}
              </TableCell>

              <TableCell className="pl-4 pr-4 capitalize max-md:hidden">
                {t.paymentChannel}
              </TableCell>

              <TableCell className="pl-4 pr-4 max-md:hidden">
                <CategoryBadge category={t.category} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default TransactionsTable;
