import React, { useState } from "react";
import { dualInputStyle, leftInputStyle, rightInputStyle } from './styles';

export const ConfigEntry = ({
    name,
    value,
    id
}) => {
    return (
        <div css={dualInputStyle}>
            <div css={leftInputStyle}>
            <textarea
            id={"headername" + id}
            value={name}
            rows={4}
            />
            </div>
            <div css={rightInputStyle}>
            <textarea
            id={"headervalue" + id}
            value={value}
            rows={4}
            />
            </div>
        </div>
    );
}