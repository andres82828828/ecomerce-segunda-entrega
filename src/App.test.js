import { render, screen } from "@testing-library/react";
import App from "./App";

test("renderiza el nombre de la tienda", () => {
  render(<App />);
  const titulo = screen.getByRole("heading", { name: /MEGABYTE/i, level: 1 });
  expect(titulo).toBeInTheDocument();
});

test("renderiza el catálogo de productos", () => {
  render(<App />);
  const catalogo = screen.getByText(/Catálogo de productos/i);
  expect(catalogo).toBeInTheDocument();
});
