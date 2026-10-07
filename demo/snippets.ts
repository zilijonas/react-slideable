export const photoStyles = `.photo {
  height: 240px;
  border-radius: 12px;
  overflow: hidden;
}

.photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}`;

export const arrowStyles = `.custom-arrows .react-slideable__button {
  border: 0;
  border-radius: 7px;
  background: #eaf0e3;
  font-size: 22px;
}`;

export const logoStyles = `.logo-example {
  width: 100%;
  margin-inline: 0;
}

.logo {
  height: 108px;
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.logo svg {
  width: 28px;
  height: 28px;
}`;

export const cardStyles = `.css-styled {
  --react-slideable-gap: 24px;
}

@media (max-width: 600px) {
  .css-styled {
    --react-slideable-gap: 8px;
  }
}

${arrowStyles}

.note {
  height: 180px;
  padding: 16px 20px;
  border-radius: 10px;
}`;
