import React, {
  forwardRef,
  useCallback,
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
import {
  useTrayFlow,
  useTrayHostActions,
  useTrayScope,
} from "../runtime/tray-context";

export const TrayTextInput = forwardRef<TextInput, TextInputProps>(
  ({ autoFocus = false, ...props }, forwardedRef) => {
    const ref = useRef<TextInput>(null);
    const trayId = useTrayScope();
    const { anticipateKeyboard } = useTrayFlow();
    const { registerFocusable } = useTrayHostActions();

    useImperativeHandle(forwardedRef, () => ref.current as TextInput);

    useEffect(() => {
      if (!trayId) {
        return;
      }

      return registerFocusable(trayId, ref);
    }, [registerFocusable, trayId]);

    useEffect(() => {
      if (!autoFocus) {
        return;
      }

      anticipateKeyboard();
      ref.current?.focus();
    }, [anticipateKeyboard, autoFocus]);

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
