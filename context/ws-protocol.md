I want to create support chat between customer (Customer User - CU) and agent (Agent User - AU) using websocket (WS) Algorithm is folowing:

1. Customer (CU) login eg. `cust1` - CU has support page, with two children - `chat` and `archived requests`.
2. CU goes to support/chat page. Check is opened Chat exist - if yes connect to current (so one CU has only one active chat)
    - 2.1.  Else  propose CU create new - CU create the chat with initial message. 

  Here we init WS session  


3. Agent User (AU) login eg. `agent1`
    Need to connect to WS to get chats updates. So need to be able see notification when new chat from CU is arrived, or new message from the chat where current AU connected (if it not on the chat page)

5. Agent User (AU) have `support` page with list of active chats attached to him, 
list of `chat requests` w/o any AU connected. Separated page (tab) for the active chats attached to other agents AUs. Separated page for archived chats.

6. When CU create new chat - list of `chat requests` in  Agent User (AU) 
page automatically update by WS (for example `agent1` will see `cust1` request)

7. AU click on chat and attach(connect) to it (now chat has two user and two session AU and CU) - open `chat` page (can be in separated Browser Tab or Window).  `My chats list`, `Chat requests` will automativally update by WS. To other AU users . CU also gets update of chat status via WS (in CU UI add note - "agent1 is connected *`<datetime>`*")


8. CU or AU start typing. Notify via WS - show in UI messages like - `agent1 typing...` in CU UI  or `cust1 typing...` in AU UI. Note: in UI need debounce, don't need to send notification on each keypressed.

9. CU or AU send message. Notify via WS - show new message in UI. In case of send error show error alert (Error also via WS)

10. CU or AU change message. In UI there is button (on hover and on longclick on mobile) to edit message (pensil icon). In this case message shon in edit field and shown two bottons "Cancel", "Update". If "Cancel" back send UI to initial state - empty textarea + send button. If click "Update" - send update message request with message ID and notify via WS another user. In the chat in the bottom of changed  message show small muted text "Edited *`<datetime>`*". Note only creater of message able to edit message.

11. CU or AU delete message. On db we don't delete message just remove content and mark as deleted. Notify via WS - message deleted and make it empty in chat and show small muted text "Deleted *`<datetime>`*" Note only creater of message able to delete message.

12. CU or AU recieve message in UI.  Notify another side and mark message as READ - in DB and in UI (add icon `V`)

13. User CU or AU disconnet for any reason, need to notify another user via WS. Show in chat history "Cust1 leave chat *`<datetime>`*" or "Agent1 leave chat  *`<datetime>`*"

14. User CU or AU reconnect to chat, Notify via WS and show message in chat "Cust1 is connected *`<datetime>`*" or  Aagent1 is connected *`<datetime>`*"


15.  Chat was closed by CU or AU - move chat to archive - notify by WS both participants and other agents to move chat from the active list to archive in UI.



## Database sturcture
```
User
---
id uuid,
username , 
email, 
type [CLIENT | AGENT]
...
```

```
Chat
---
id uuid,
ClientId (FK User.id), 
AgentId (FK User.id, NULLABLE) , 
Staus (NEW|ATTACHED|DETACCHED|ARCHIVED)
CreatedTime,
UpdatedTime
.... 
```

```
ChatMessages
---
ChatId (FK chat.id),
FromUserId (FK User.id),
senderType ([CLENT | AGENT]  - To simplify determin derection of message),
Message varchar(1000),
Status [NEW | READ | CHANGED | DELETED ]

CreateTime, 
UpdatedTime,

```
