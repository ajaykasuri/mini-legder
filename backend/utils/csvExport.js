const { Parser } = require('json2csv');

function transactionsToCsv(transactions) {
  const fields = [
    { label: 'Date', value: 'transaction_date' },
    { label: 'Type', value: 'type' },
    { label: 'Category', value: 'category_name' },
    { label: 'Description', value: 'description' },
    { label: 'Amount', value: 'amount' },
  ];

  const parser = new Parser({ fields });
  return parser.parse(transactions);
}

module.exports = { transactionsToCsv };
