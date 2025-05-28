import * as React from "react";
import { DefaultButton } from "@fluentui/react";

interface ResponseMailSectionProps {
  onGenerateResponse: (mailContent: string) => void;
  isLoading: boolean;
  responseText: string;
}

export const ResponseMailSection: React.FC<ResponseMailSectionProps> = ({
  onGenerateResponse,
  isLoading,
  responseText,
}) => {
  const [mailContent, setMailContent] = React.useState("");
  const [loadingMail, setLoadingMail] = React.useState(false);

  // Prefill with open mail content on mount
  React.useEffect(() => {
    setLoadingMail(true);
    if (window.Office && Office.context && Office.context.mailbox && Office.context.mailbox.item && Office.context.mailbox.item.body) {
      Office.context.mailbox.item.body.getAsync(Office.CoercionType.Text, (result: any) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          setMailContent(result.value || "");
        }
        setLoadingMail(false);
      });
    } else {
      setLoadingMail(false);
    }
  }, []);

  return (
    <div style={{ padding: 16, border: "1px solid #e0e0e0", borderRadius: 8, background: "#fafbfc", maxWidth: 520 }}>
      <label htmlFor="mail-content-textarea" style={{ fontWeight: 600, marginBottom: 6, display: "block" }}>
        Paste or write the email you want to respond to:
      </label>
      <div style={{ marginBottom: 10, color: '#888', fontSize: 13 }}>
        (By default, the content of the open mail is loaded. You can edit it before generating a response.)
      </div>
      <textarea
        id="mail-content-textarea"
        style={{ width: "100%", minHeight: 80, border: "1.5px solid #b0b0b0", borderRadius: 5, padding: 8, fontSize: 15, background: loadingMail ? '#f0f0f0' : 'white' }}
        onChange={(e) => setMailContent(e.target.value)}
        value={mailContent}
        disabled={loadingMail}
        placeholder={loadingMail ? "Loading mail content..." : "Paste or write your email here..."}
      />
      <div style={{ margin: "16px 0" }}>
        <DefaultButton
          className="ms-welcome__action"
          iconProps={{ iconName: "ChevronRight" }}
          onClick={() => onGenerateResponse(mailContent)}
          disabled={isLoading || !mailContent.trim() || loadingMail}
          title="Generate a suggested response to the above email"
        >
          Generate response
        </DefaultButton>
        {isLoading && <span style={{ marginLeft: 15, color: '#0078d4' }}>Generating response...</span>}
      </div>
      <label htmlFor="generated-response-textarea" style={{ fontWeight: 600, marginBottom: 6, display: "block" }}>
        Generated response:
      </label>
      <textarea
        id="generated-response-textarea"
        style={{ width: "100%", minHeight: 120, border: "1.5px solid #b0b0b0", borderRadius: 5, padding: 8, fontSize: 15, background: '#f8f8f8', marginBottom: 0 }}
        value={responseText}
        readOnly
        placeholder="The generated response will appear here."
      />
    </div>
  );
};
