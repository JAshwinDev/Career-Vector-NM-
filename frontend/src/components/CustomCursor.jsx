import { useMousePosition } from "../hooks/useMousePosition";
import "../styles/custom-cursor.css";

export default function CustomCursor() {
  const { x, y } = useMousePosition();
  return <div className="custom-cursor" style={{ left: x, top: y }} />;
}
