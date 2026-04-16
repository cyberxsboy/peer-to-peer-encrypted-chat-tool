import React from 'react';

type ReceiptStatus = 'sending' | 'sent' | 'delivered' | 'read';

interface MessageReceiptProps {
  status: ReceiptStatus;
}

export default function MessageReceipt({ status }: MessageReceiptProps) {
  const getIcon = () => {
    switch (status) {
      case 'sending':
        return '⏳';
      case 'sent':
        return '✓';
      case 'delivered':
        return '✓✓';
      case 'read':
        return '✓✓';
      default:
        return '';
    }
  };

  const getClassName = () => {
    let className = 'receipt';
    if (status === 'read') {
      className += ' read';
    } else if (status === 'delivered') {
      className += ' delivered';
    }
    return className;
  };

  return (
    <span className={getClassName()}>
      {getIcon()}
    </span>
  );
}