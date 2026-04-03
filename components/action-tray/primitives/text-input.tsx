import React, { useRef, useEffect } from "react";
import { TextInput, TextInputProps } from "react-native";
import { useTray } from "../context/context";

export const TrayTextInput = (props: TextInputProps) => {
  const ref = useRef<TextInput>(null);
  const { registerFocusable } = useTray();

  useEffect(() => {
    registerFocusable(ref);
  }, [registerFocusable]);

  return <TextInput ref={ref} {...props} />;
};
