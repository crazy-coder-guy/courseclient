import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const RefundModal = ({ isOpen, onClose, courseId, onSubmit }) => {
  const [formData, setFormData] = useState({
    reason: '',
    comments: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [refundAmount, setRefundAmount] = useState(null);
  const [originalAmount, setOriginalAmount] = useState(null);
  const [isLoadingAmount, setIsLoadingAmount] = useState(true);
  const [isRefundEligible, setIsRefundEligible] = useState(true);
  const [ineligibilityReason, setIneligibilityReason] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const fetchRefundAmount = async () => {
        setIsLoadingAmount(true);
        setError(null);
        setIsRefundEligible(true);
        setIneligibilityReason(null);
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/courses/${courseId}/purchase-status`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to fetch purchase details');
          }

          const { hasPurchased, isRefundEligible, reason, data } = await response.json();
          if (!hasPurchased) {
            throw new Error('You have not purchased this course');
          }
          if (!isRefundEligible) {
            setIsRefundEligible(false);
            setIneligibilityReason(reason || 'You are not eligible for a refund');
            return;
          }
          if (data && data.refund_amount && data.original_amount) {
            setRefundAmount(data.refund_amount); // Already in rupees
            setOriginalAmount(data.original_amount); // Already in rupees
          } else {
            throw new Error('Purchase details not available');
          }
        } catch (err) {
          setError(err.message);
        } finally {
          setIsLoadingAmount(false);
        }
      };

      fetchRefundAmount();
    }
  }, [isOpen, courseId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/courses/${courseId}/refund`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to submit refund request');
      }

      setSuccess('Refund request submitted successfully!');
      setFormData({ reason: '', comments: '' });
      setTimeout(() => {
        onClose();
        setSuccess(null);
        onSubmit();
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-900"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold text-red-950 mb-4">Request a Refund</h2>
        {isLoadingAmount ? (
          <div className="text-sm text-gray-700 mb-4">Loading refund details...</div>
        ) : error ? (
          <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-sm">
            {error}
          </div>
        ) : !isRefundEligible ? (
          <div className="bg-yellow-100 text-yellow-700 p-3 rounded-md mb-4 text-sm">
            {ineligibilityReason}
          </div>
        ) : refundAmount !== null && originalAmount !== null ? (
          <div className="bg-blue-100 text-blue-700 p-3 rounded-md mb-4 text-sm">
            You are eligible for a refund of ₹{refundAmount.toFixed(2)} (75% of the original amount of ₹{originalAmount.toFixed(2)}).
          </div>
        ) : (
          <div className="bg-yellow-100 text-yellow-700 p-3 rounded-md mb-4 text-sm">
            Unable to display refund amount. Please proceed with the request or contact support.
          </div>
        )}
        {success && (
          <div className="bg-green-100 text-green-700 p-3 rounded-md mb-4 text-sm">
            {success}
          </div>
        )}
        {isRefundEligible && !error && !isLoadingAmount && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                Reason for Refund
              </label>
              <select
                id="reason"
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-red-950 focus:border-red-950"
              >
                <option value="">Select a reason</option>
                <option value="not_as_expected">Course not as expected</option>
                <option value="technical_issues">Technical issues</option>
                <option value="changed_mind">Changed my mind</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="comments" className="block text-sm font-medium text-gray-700">
                Additional Comments
              </label>
              <textarea
                id="comments"
                name="comments"
                value={formData.comments}
                onChange={handleChange}
                rows={4}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-red-950 focus:border-red-950"
                placeholder="Please provide more details about your refund request..."
              ></textarea>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-4 py-2 text-sm font-medium text-yellow-50 bg-red-950 hover:bg-red-900 rounded-md ${
                  isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Refund Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default RefundModal;