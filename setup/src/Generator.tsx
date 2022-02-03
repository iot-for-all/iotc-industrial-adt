import {
  DefaultButton,
  Icon,
  mergeStyleSets,
  ProgressIndicator,
  Text,
  TextField,
} from "@fluentui/react";
import { useBoolean, useId } from "@fluentui/react-hooks";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";
import { editor, editor as monacoeditor } from "monaco-editor";
//@ts-ignore
import { registerJQLanguageDefinition } from "monaco-languages-jq";
import { generateQuery } from "./mapping/generator";

const styles = mergeStyleSets({
  centerVertical: {
    alignItems: "center",
  },
  centerText: {
    textAlign: "center",
  },
});

const Generator = React.memo(() => {
  const [state, setState] = useState<{
    apiKey?: string;
    appUrl?: string;
    mapping?: string;
  }>({
    apiKey: "",
    mapping: "",
    appUrl: "",
  });
  const [errorText, setErrorText] = useState("");
  const monaco = useMonaco();
  const jsonDiv = useId();
  const jqDiv = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mappingEditor = useRef<monacoeditor.IStandaloneCodeEditor | null>(null);
  const queryEditor = useRef<monacoeditor.IStandaloneCodeEditor | null>(null);
  const [isQueryGenerated, { setTrue: showQuery }] = useBoolean(false);
  const [exports, setExports] = useState<[] | null>(null);

  useEffect(() => {
    if (monaco) {
      registerJQLanguageDefinition(monaco);
    }
  }, [monaco]);

  const onQueryMount = (editor: monacoeditor.IStandaloneCodeEditor) => {
    queryEditor.current = editor;
  };

  const onMappingMount = (editor: monacoeditor.IStandaloneCodeEditor) => {
    mappingEditor.current = editor;
  };

  const loadExports = useCallback(async () => {
    let url = state.appUrl!;
    if (!state.appUrl?.startsWith("http")) {
      url = `https://${url}`;
    }
    const exportResponse = await fetch(
      `${url}/api/dataExport/exports?api-version=1.1-preview`,
      {
        method: "GET",
        headers: {
          Authorization: state.apiKey!,
        },
      }
    );
    console.log(await exportResponse.json());
  }, [state.appUrl]);

  const upload = useCallback(async (ev) => {
    ev.preventDefault();
    const reader = new FileReader();
    reader.onload = async (e) => {
      mappingEditor.current?.setValue(e.target?.result as string);
    };
    reader.readAsText(ev.target.files[0]);
  }, []);

  const generate = useCallback(() => {
    try {
      queryEditor.current?.setValue(
        generateQuery(mappingEditor.current?.getValue()!)
      );
      showQuery();
    } catch (e) {
      setErrorText(`Mapping data is malformed. Check is a valid JSON.`);
    }
  }, [state, setErrorText]);

  const save = useCallback(() => {
    try {
      const mapping = JSON.stringify(state.mapping);
    } catch (e) {
      setErrorText(`Mapping data is malformed. Check is a valid JSON.`);
    }
  }, [state, setErrorText]);

  return (
    <div className="full-height width-80p">
      <div className="padding-vertical"></div>
      <div className={`padding-vertical flex-horizontal`}>
        <div className="flex2">
          <label htmlFor={jsonDiv} className="ms-label root-112">
            Mapping
          </label>
          <div className="padding-vertical box" id={jsonDiv}>
            <Editor
              height="40vh"
              defaultLanguage="json"
              defaultValue="{}"
              onMount={onMappingMount}
            />
          </div>
          <div className="padding-vertical flex-space-between">
            <DefaultButton
              text="Load File"
              onClick={() => {
                fileInputRef.current?.click();
              }}
            />
            <input
              type="file"
              accept="application/json"
              style={{ display: "none" }}
              onChange={upload}
              ref={fileInputRef}
            />
          </div>
        </div>
        <div className="flex1 justify-center align-center">
          <DefaultButton
            iconProps={{ iconName: "DoubleChevronRight8" }}
            text="Generate"
            onClick={generate}
          />
        </div>
        <div className="flex2">
          <label htmlFor={jqDiv} className="ms-label root-112">
            Query
          </label>
          <div className="padding-vertical box" id={jqDiv}>
            <Editor
              height="40vh"
              defaultLanguage="jq"
              defaultValue=""
              options={{ lineNumbers: "off", readOnly: true }}
              onMount={onQueryMount}
            />
          </div>
        </div>
      </div>
      <div className="padding-vertical">
        <Text>{errorText}</Text>
      </div>
      <div className="padding-vertical flex-center flex1">
        <TextField
          className="width-80p"
          label="Application Url"
          disabled={!isQueryGenerated}
          value={state.appUrl}
          onChange={(_, appUrl) =>
            setState((current) => ({ ...current, appUrl }))
          }
        />
        <TextField
          className="width-80p"
          label="Api Key"
          disabled={!isQueryGenerated}
          value={state.apiKey}
          onChange={(_, apiKey) =>
            setState((current) => ({ ...current, apiKey }))
          }
        />
        <div className="padding-vertical">
          <DefaultButton
            text="Search exports"
            disabled={!isQueryGenerated}
            onClick={loadExports}
          />
        </div>
        <div className="padding-vertical flex-center">
          {!exports && (
            <ProgressIndicator
              className="width-80p text-center"
              label="Loading exports..."
            />
          )}
        </div>
      </div>
    </div>
  );
});

export default Generator;
