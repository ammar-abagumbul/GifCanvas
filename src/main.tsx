import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Step3NonElderly from "./pages/sticker-page.tsx";
import "./index.css";

const goBack = () => {
}

const goNext = () => {
}

const stepFunctions = { goBack, goNext }

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Step3NonElderly stepFunctions={stepFunctions} />
  </StrictMode>,
);

