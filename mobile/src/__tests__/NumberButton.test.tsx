import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { NumberButton } from "../components/NumberButton";

describe("NumberButton", () => {
  it("renders its digit", () => {
    const { getByText } = render(<NumberButton value={7} onPress={() => {}} />);
    expect(getByText("7")).toBeTruthy();
  });

  it("calls onPress with its value when tapped", () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<NumberButton value={3} onPress={onPress} />);
    fireEvent.press(getByLabelText("Send button 3"));
    expect(onPress).toHaveBeenCalledWith(3);
  });

  it("does not fire when disabled", () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<NumberButton value={3} disabled onPress={onPress} />);
    fireEvent.press(getByLabelText("Send button 3"));
    expect(onPress).not.toHaveBeenCalled();
  });
});
