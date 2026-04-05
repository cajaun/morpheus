import React, {
  useCallback,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import {
  NativeSyntheticEvent,
  TextInput,
  TextInputFocusEventData,
  TextInputProps,
} from "react-native";
import { useTray } from "../context/context";
import { useTrayScope } from "../context/root";

export const TrayTextInput = forwardRef<TextInput, TextInputProps>(
  ({ autoFocus = false, ...props }, forwardedRef) => {
    const ref = useRef<TextInput>(null);
    const trayId = useTrayScope();
    const { registerFocusable, anticipateKeyboard } = useTray();

    useImperativeHandle(forwardedRef, () => ref.current as TextInput);

    useEffect(() => {
      return registerFocusable(trayId, ref);
    }, [registerFocusable, trayId]);

    useEffect(() => {
      if (!autoFocus) {
        return;
      }

      anticipateKeyboard();
      ref.current?.focus();
    }, [anticipateKeyboard, autoFocus, trayId]);

    const handleFocus = useCallback(
      (event: NativeSyntheticEvent<TextInputFocusEventData>) => {
        anticipateKeyboard();
        props.onFocus?.(event);
      },
      [anticipateKeyboard, props],
    );

    return (
      <TextInput
        ref={ref}
        autoFocus={false}
        {...props}
        onFocus={handleFocus}
      />
    );
  },
);

TrayTextInput.displayName = "TrayTextInput";
