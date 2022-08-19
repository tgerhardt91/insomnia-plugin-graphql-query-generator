import React, { MouseEventHandler } from 'react';

import { buttonStyle } from './styles';

interface IButtonProps {
  id?: string | null;
  label?: string | null | undefined;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  closeModal?: boolean;
  disable: boolean;
}

const Button: React.FC<IButtonProps> = ({ id, label, onClick, closeModal, disable }) => {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      data-close-modal={closeModal}
      disabled={disable}
      css={buttonStyle}
    >
      {label}
    </button>
  );
};

export default Button;