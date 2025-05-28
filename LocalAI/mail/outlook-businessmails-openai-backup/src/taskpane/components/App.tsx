/* eslint-disable no-undef */
import * as React from "react";
import { DefaultButton, Pivot, PivotItem } from "@fluentui/react";
import Progress from "./Progress";
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";
import { ResponseMailSection } from "./ResponseMailSection";
import { ChatAndDocSection } from "./ChatAndDocSection";
import { generateEmailResponse } from "../utils/api";

/* global require */

export interface AppProps {
  title: string;
  isOfficeInitialized: boolean;
}



interface ChatMessage {
  sender: string;
  message: string;
}

interface AppState {
  responseMailText: string;
  responseMailLoading: boolean;
  responseMailError: string;
  isResponseMailActive: boolean;
  selectedTab: "response" | "chat";
  chatHistory: ChatMessage[];
  chatLoading: boolean;
  documentContent: string;
}

export default class App extends React.Component<AppProps, AppState> {
  constructor(props) {
    super(props);

    this.state = {
      responseMailText: "",
      responseMailLoading: false,
      responseMailError: "",
      isResponseMailActive: false,
      selectedTab: "response",
      chatHistory: [],
      chatLoading: false,
      documentContent: "",
    };
  }

  handleTabChange = (tab: "response" | "chat") => {
    this.setState({ selectedTab: tab });
  };

  handleSendMessage = async (message: string, mode: 'chat' | 'doc') => {
    if (mode === 'chat') {
      // Simulate chat API
      this.setState(prev => ({
        chatHistory: [...prev.chatHistory, { sender: "User", message }],
        chatLoading: true,
      }));
      setTimeout(() => {
        this.setState(prev => ({
          chatHistory: [...prev.chatHistory, { sender: "Bot", message: "[ChatBot] Echo: " + message }],
          chatLoading: false,
        }));
      }, 1000);
    } else {
      // Simulate doc API
      this.setState({ chatLoading: true });
      setTimeout(() => {
        this.setState({
          documentContent: "[DocAPI] Fetched document for: " + message,
          chatLoading: false,
        });
      }, 1200);
    }
  };

  render() {
    const { title, isOfficeInitialized } = this.props;

    if (!isOfficeInitialized) {
      return (
        <Progress
          title={title}
          logo={require("./../../../assets/logo-filled.png")}
          message="Please sideload your addin to see app body."
        />
      );
    }

    return (
      <div className="ms-welcome">
        <main className="ms-welcome__main">
          <h2 className="ms-font-xl ms-fontWeight-semilight ms-fontColor-neutralPrimary ms-u-slideUpIn20">
            Outlook AI Assistant
          </h2>
          <Pivot
            selectedKey={this.state.selectedTab}
            onLinkClick={item => this.handleTabChange(item?.props.itemKey as "response" | "chat")}
            styles={{ root: { marginBottom: 24 } }}
          >
            <PivotItem headerText="Generate Answer" itemKey="response" style={{ minHeight: 400 }}>
              <ResponseMailSection
                onGenerateResponse={this.handleGenerateResponseMail}
                isLoading={this.state.responseMailLoading}
                responseText={this.state.responseMailText}
              />
            </PivotItem>
            <PivotItem headerText="Chat & Fetch Document" itemKey="chat" style={{ minHeight: 400 }}>
              <ChatAndDocSection
                onSendMessage={this.handleSendMessage}
                isLoading={this.state.chatLoading}
                chatHistory={this.state.chatHistory}
                documentContent={this.state.documentContent}
              />
            </PivotItem>
          </Pivot>
        </main>
      </div>
    );
  }

  handleGenerateResponseMail = async (mailContent: string) => {
    this.setState({ responseMailLoading: true, responseMailError: "", responseMailText: "" });
    console.log("mailContent", mailContent);
    try {
      const req = {
        subject: "",
        recipient: "",
        prompt: "",
        conversation: mailContent,
        user_id: "",
        question: "",
      };
      const result = await generateEmailResponse(req);
      this.setState({ responseMailText: result.draft, responseMailLoading: false });

      // Office.js: Create a reply and insert the generated text
      console.debug("Office object:", Office);
      console.debug("Office.context:", Office.context);
      console.debug("Office.context.mailbox:", Office.context.mailbox);
      console.debug("Office.context.mailbox.item:", Office.context.mailbox.item);
      if (Office.context.mailbox.item.displayReplyForm) {
        try {
          Office.context.mailbox.item.displayReplyForm({
            htmlBody: result.draft
          });
          console.debug("Called displayReplyForm successfully.");
        } catch (err) {
          console.error("displayReplyForm threw an error:", err);
          alert("Error: displayReplyForm threw an error: " + err);
        }
      } else if (Office.context.mailbox.item.body && Office.context.mailbox.item.body.setAsync) {
        // fallback for compose mode or if reply form is already open
        try {
          Office.context.mailbox.item.body.setAsync(result.draft, { coercionType: Office.CoercionType.Html }, (asyncResult: any) => {
            if (asyncResult.status !== Office.AsyncResultStatus.Succeeded) {
              console.error("setAsync failed:", asyncResult.error);
              alert("Error: setAsync failed: " + asyncResult.error.message);
            } else {
              console.debug("Inserted draft using setAsync.");
            }
          });
        } catch (err) {
          console.error("setAsync threw an error:", err);
          alert("Error: setAsync threw an error: " + err);
        }
      } else {
        console.error("Neither displayReplyForm nor setAsync is available on this item.");
        alert("Error: Neither displayReplyForm nor setAsync is available on this item.");
      }
    } catch (e: any) {
      this.setState({ responseMailError: e.message, responseMailLoading: false });
    }
  };


}

