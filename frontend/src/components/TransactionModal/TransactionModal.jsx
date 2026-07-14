import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import '../../styles/transaction-modal.css';

export default function TransactionModal({ open, onClose, onSubmit, categories, initialValues }) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: initialValues || {
      type: 'expense',
      amount: '',
      category_id: '',
      description: '',
      transaction_date: new Date().toISOString().slice(0, 10),
    },
  });

  // Re-seed the form whenever a different transaction is opened for editing.
  useEffect(() => {
    reset(
      initialValues || {
        type: 'expense',
        amount: '',
        category_id: '',
        description: '',
        transaction_date: new Date().toISOString().slice(0, 10),
      }
    );
  }, [initialValues, reset, open]);

  if (!open) return null;

  const type = watch('type');
  const filteredCategories = (categories || []).filter((c) => c.type === type);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{initialValues ? 'Edit Transaction' : 'Add Transaction'}</h2>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="type-toggle">
            <label className={type === 'expense' ? 'active-expense' : ''}>
              <input type="radio" value="expense" {...register('type')} /> Expense
            </label>
            <label className={type === 'income' ? 'active-income' : ''}>
              <input type="radio" value="income" {...register('type')} /> Income
            </label>
          </div>

          <div className="field">
            <label>Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register('amount', {
                required: 'Amount is required',
                min: { value: 0.01, message: 'Amount cannot be negative or zero' },
              })}
            />
            {errors.amount && <p className="field-error">{errors.amount.message}</p>}
          </div>

          <div className="field">
            <label>Category</label>
            <select {...register('category_id', { required: 'Category is required' })}>
              <option value="">Select a category</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.category_id && <p className="field-error">{errors.category_id.message}</p>}
          </div>

          <div className="field">
            <label>Description</label>
            <input placeholder="e.g. Dinner at restaurant" {...register('description')} />
          </div>

          <div className="field">
            <label>Date</label>
            <input type="date" {...register('transaction_date', { required: 'Date is required' })} />
            {errors.transaction_date && <p className="field-error">{errors.transaction_date.message}</p>}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : initialValues ? 'Save changes' : 'Add transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
