"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { trpc } from "@/lib/trpc/client";

interface FundingModalProps {
  accountId: number;
  onClose: () => void;
  onSuccess: () => void;
}

type FundingFormData = {
  amount: string;
  fundingType: "card" | "bank";
  accountNumber: string;
  routingNumber?: string;
};

export function FundingModal({ accountId, onClose, onSuccess }: FundingModalProps) {
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FundingFormData>({
    defaultValues: {
      fundingType: "card",
    },
  });

  const fundingType = watch("fundingType");
  const fundAccountMutation = trpc.account.fundAccount.useMutation();

  const onSubmit = async (data: FundingFormData) => {
    setError("");

    try {
      const amount = parseFloat(data.amount);

      await fundAccountMutation.mutateAsync({
        accountId,
        amount,
        fundingSource: {
          type: data.fundingType,
          accountNumber: data.accountNumber,
          routingNumber: data.routingNumber,
        },
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to fund account");
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Fund Your Account</h3>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Amount</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                {...register("amount", {
                  required: "Amount is required",
                  pattern: {
                    value: /^\d+\.?\d{0,2}$/,
                    message: "Invalid amount format",
                  },
                  validate: {
                    notZero: (value) => {
                      const amount = parseFloat(value);
                      if (amount === 0 || amount < 0.01) {
                        return "Amount must be at least $0.01";
                      }
                      return true;
                    },
                    notNegative: (value) => {
                      const amount = parseFloat(value);
                      if (amount < 0) {
                        return "Amount cannot be negative";
                      }
                      return true;
                    },
                    maxAmount: (value) => {
                      const amount = parseFloat(value);
                      if (amount > 10000) {
                        return "Amount cannot exceed $10,000";
                      }
                      return true;
                    },
                    noLeadingZeros: (value) => {
                      if (/^0\d/.test(value)) {
                        return "Remove leading zeros";
                      }
                      return true;
                    },
                  },
                })}
                type="text"
                className="pl-7 block w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border text-gray-900 bg-white"
                placeholder="0.00"
              />
            </div>
            {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Funding Source</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input {...register("fundingType")} type="radio" value="card" className="mr-2" />
                <span className="text-gray-900">Credit/Debit Card</span>
              </label>
              <label className="flex items-center">
                <input {...register("fundingType")} type="radio" value="bank" className="mr-2" />
                <span className="text-gray-900">Bank Account</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {fundingType === "card" ? "Card Number" : "Account Number"}
            </label>
            <input
              {...register("accountNumber", {
              required: `${fundingType === "card" ? "Card" : "Account"} number is required`,
              validate: {
              validFormat: (value) => {
                if (fundingType === "card") {
                  const cleaned = value.replace(/[\s-]/g, '');
                  
                  if (!/^\d{13,19}$/.test(cleaned)) {
                    return "Card number must be 13-19 digits";
                  }
                  
                  // Luhn algorithm validation
                  let sum = 0;
                  let isEven = false;
                  
                  for (let i = cleaned.length - 1; i >= 0; i--) {
                    let digit = parseInt(cleaned[i]);
                    
                    if (isEven) {
                      digit *= 2;
                      if (digit > 9) {
                        digit -= 9;
                      }
                    }
                    
                    sum += digit;
                    isEven = !isEven;
                  }
                  
                  if (sum % 10 !== 0) {
                    return "Invalid card number";
                  }
                  
                  return true;
                } else {
                  // Bank account validation
                  if (!/^\d{4,17}$/.test(value)) {
                    return "Account number must be 4-17 digits";
                  }
                  return true;
                }
              },
              validCardType: (value) => {
                if (fundingType !== "card") return true;
                
                const cleaned = value.replace(/[\s-]/g, '');
                
                // Visa: starts with 4
                if (/^4/.test(cleaned)) return true;
                
                // Mastercard: starts with 51-55 or 2221-2720
                if (/^5[1-5]/.test(cleaned)) return true;
                if (/^2(2[2-9][0-9]|[3-6][0-9]{2}|7[0-1][0-9]|720)/.test(cleaned)) return true;
                
                // American Express: starts with 34 or 37
                if (/^3[47]/.test(cleaned)) return true;
                
                // Discover: starts with 6011, 622126-622925, 644-649, 65
                if (/^6011/.test(cleaned)) return true;
                if (/^62212[6-9]/.test(cleaned)) return true;
                if (/^6229[01][0-9]/.test(cleaned)) return true;
                if (/^622[2-8][0-9]{2}/.test(cleaned)) return true;
                if (/^6229[2][0-5]/.test(cleaned)) return true;
                if (/^64[4-9]/.test(cleaned)) return true;
                if (/^65/.test(cleaned)) return true;
                
                return "Card type not supported. We accept Visa, Mastercard, Amex, and Discover";
              },
              }
              })}
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border text-gray-900 bg-white"
              placeholder={fundingType === "card" ? "1234567812345678" : "123456789"}
            />
            {errors.accountNumber && <p className="mt-1 text-sm text-red-600">{errors.accountNumber.message}</p>}
          </div>

          {fundingType === "bank" && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Routing Number</label>
              <input
                {...register("routingNumber", {
                  required: fundingType === "bank" ? "Routing number is required for bank transfers" : false,
                  validate: {
                    validRoutingNumber: (value) => {
                      if (fundingType !== "bank") return true;
                      if (!value) return "Routing number is required for bank transfers";
                      
                      // Must be exactly 9 digits
                      if (!/^\d{9}$/.test(value)) {
                        return "Routing number must be exactly 9 digits";
                      }
                      
                      // ABA routing number checksum validation
                      const digits = value.split('').map(Number);
                      const checksum = 
                        (3 * (digits[0] + digits[3] + digits[6])) +
                        (7 * (digits[1] + digits[4] + digits[7])) +
                        (1 * (digits[2] + digits[5] + digits[8]));
                      
                      if (checksum % 10 !== 0) {
                        return "Invalid routing number";
                      }
                      return true;
                    },
                  },
                })}
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border text-gray-900 bg-white"
                placeholder="123456789"
              />
              {errors.routingNumber && <p className="mt-1 text-sm text-red-600">{errors.routingNumber.message}</p>}
            </div>
          )}

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={fundAccountMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {fundAccountMutation.isPending ? "Processing..." : "Fund Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
