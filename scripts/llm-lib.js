/*
 * Class that holds constants - not the API key?
 */
class llmSettings {
  static ID = "llm-lib";

  static SETTINGS = {
    API_KEY: "api_key",
    USE_API_KEY: "use_api_key",
    SECRET_KEY: "secret_key",
    KEYS: "keys"
  };

  static TEMPLATES = {
    CHATBOT: `modules/${this.ID}/templates/llm-lib.hbs`,
  };


  /**
   * A small helper function which leverages developer mode flags to gate debug logs.
   *
   * @param {boolean} force - forces the log even if the debug flag is not on
   * @param  {...any} args - what to log
   */
  static log(force, ...args) {
    const shouldLog =
      force ||
      game.modules.get("_dev-mode")?.api?.getPackageDebugValue(this.ID);

    if (shouldLog) {
      console.log(this.ID, "|", ...args);
    }
  }

  static initialize() {
    this.llmSettings = new llmSettings();

    game.settings.register(this.ID, this.SETTINGS.API_KEY, {
      name: `CHAT-BOT.settings.${this.SETTINGS.API_KEY}.Name`,
      default: "",
      type: String,
      scope: "world", // or is it 'client'?
      config: false,
      hint: `CHAT-BOT.settings.${this.SETTINGS.API_KEY}.Hint`,
      onChange: () => {}, // Probably don't need this if I can just grab it from game.settings.get. Instead in future this could be a way to let me know something has changed?
      restricted: true,
    });

    game.settings.register(this.ID, this.SETTINGS.USE_API_KEY, {
        name: `CHAT-BOT.settings.${this.SETTINGS.USE_API_KEY}.Name`,
        default: false,
        type: Boolean,
        scope: "world",
        config: true,
        restricted: true,
        hint: `CHAT-BOT.settings.${this.SETTINGS.USE_API_KEY}.Hint`
    });

    game.settings.register(this.ID, this.SETTINGS.SECRET_KEY, {
        name: `CHAT-BOT.settings.${this.SETTINGS.SECRET_KEY}.Name`,
        default: "",
        type: String,
        inputType: 'password',
        scope: "world",
        config: false,
        hint: `CHAT-BOT.settings.${this.SETTINGS.SECRET_KEY}.Hint`,
        restricted: true,
    });
  }
}

/**
 * Register our module's debug flag with developer mode's custom hook
 */
Hooks.once("devModeReady", ({ registerPackageDebugFlag }) => {
  registerPackageDebugFlag(llm.ID);
});

/*
 *
 */

class llmLib {
    static async callLlm(llmQuery) {
        const USE_API_KEY = game.settings.get(`${llmSettings.ID}`, `${llmSettings.SETTINGS.USE_API_KEY}`);
        const SECRET_KEY = game.settings.get(`${llmSettings.ID}`, `${llmSettings.SETTINGS.SECRET_KEY}`);
        if(USE_API_KEY) {
            const OPENAI_API_KEY = game.settings.get(`${llmSettings.ID}`, `${llmSettings.SETTINGS.API_KEY}`); // Replace with your actual API key
            const url = 'https://api.openai.com/v1/chat/completions';
    
            const data = {
                model: "gpt-4-turbo-preview",
                response_format: { type: "json_object" },
                messages: [{ "role": "system", "content": llmLib.helpfulAssistant },
                            {"role": "user", "content": llmQuery }]
                };
    
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${OPENAI_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                    });
                
                const responseData = await response.json();
                let actorData = responseData.choices[0].message.content;
                actorData = JSON.parse(actorData);
                let actor = [];
                actor.push(actorData.npc);
                actor.push(actorData.bonus);
                actor.push(actorData.description.dalle);
                return actor;
            } catch (error) {
                console.error('Error:', error);
                return null;
            }
        }
        else {
            try {
                const baseUrl = 'https://gptlibproxyserver.azurewebsites.net/api/gptlib';

                const params = {
                    msg: llmQuery,
                    pass: SECRET_KEY
                }

                const queryString = Object.keys(params).map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join('&');
                const urlWithParams = `${baseUrl}?${queryString}`;

                // const response = await fetch(`http://localhost:3000/chat?msg=${llmQuery}`);
                const response = await fetch(urlWithParams);
                console.log(response);
                if(!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const data = await response.json();
                return data;
            }
            catch(error) {
                console.error('Fetch error:', error);
            }
        }
  }

  static async callDallE(llmQuery) {
    const USE_API_KEY = game.settings.get(`${llmSettings.ID}`, `${llmSettings.SETTINGS.USE_API_KEY}`);
    const SECRET_KEY = game.settings.get(`${llmSettings.ID}`, `${llmSettings.SETTINGS.SECRET_KEY}`);
    if(USE_API_KEY) {
      const OPENAI_API_KEY = game.settings.get(`${llmSettings.ID}`, `${llmSettings.SETTINGS.API_KEY}`);
      const url = 'https://api.openai.com/v1/images/generations';
  
      const data = {
          model: "dall-e-3", // Ensure this is the correct model identifier
          prompt: "A portrait of " + llmQuery,
          n: 1, // Number of images to generate
          size: "1024x1024", // Desired size of the image
          response_format: "b64_json"
      };
  
      try {
          const response = await fetch(url, {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${OPENAI_API_KEY}`,
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify(data)
          });
  
          const responseData = await response.json();
          console.log(responseData);
          return responseData.data[0].b64_json; // Adjust based on actual response
      } catch (error) {
          console.error('Error:', error);
          return null;
      }
    }
    else {
      try {
        const baseUrl = 'https://gptlibproxyserver.azurewebsites.net/api/gptlibimg';

        const params = {
            img: llmQuery,
            pass: SECRET_KEY
        }
        const queryString = Object.keys(params).map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join('&');
        const urlWithParams = `${baseUrl}?${queryString}`;
        // const response = await fetch(`http://localhost:3000/img?msg=${llmQuery}`);
        const response = await fetch(urlWithParams);
        console.log(response);
        if(!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        return data;
      }
      catch(error) {
          console.error('Fetch error:', error);
      }
    }
  }

  static async callChat(messages) {
    const OPENAI_API_KEY = game.settings.get(`${llmSettings.ID}`, `${llmSettings.SETTINGS.API_KEY}`);
    const USE_API_KEY = game.settings.get(`${llmSettings.ID}`, `${llmSettings.SETTINGS.USE_API_KEY}`);
    const SECRET_KEY = game.settings.get(`${llmSettings.ID}`, `${llmSettings.SETTINGS.SECRET_KEY}`);
    if(USE_API_KEY) {
        const url = 'https://api.openai.com/v1/chat/completions';
    
        const data = {
            model: "gpt-4-turbo-preview",
            messages: [{ "role": "system", "content": 'You are a helpful and creative DM assistant for 5th Edition Dungeons and Dragons. You help by giving story and character suggestions to the DM' },
                        ...messages]
            };
    
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
                });
            
            const responseData = await response.json();
            let message = responseData.choices[0].message.content;
            return message;
        } catch (error) {
            console.error('Error:', error);
            return null;
        }
    }
    else {
        try {
            const baseUrl = 'https://gptlibproxyserver.azurewebsites.net/api/callChat';
            messages = JSON.stringify(messages);

            const params = {
                msg: messages,
                pass: SECRET_KEY
            }

            console.log("What do my messages look like?", messages);
            const queryString = Object.keys(params).map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join('&');
            const urlWithParams = `${baseUrl}?${queryString}`;
            // const encodedQuery = encodeURIComponent(llmQuery);
            // const response = await fetch(`http://localhost:3000/img?msg=${llmQuery}`);
            const response = await fetch(urlWithParams);
            console.log(response);
            if(!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            return data;
        }
        catch(error) {
            console.error('Fetch error:', error);
        }
    }
  }

  static callPredetermined() {
    return this.elara;
  }

  static callPredeterminedImg() {
    return this.b64;
  }

  static helpfulAssistant = `
  You are a helpful and creative dm assistant for 5th Edition Dungeons and Dragons. You help by providing descriptions and stat blocks for NPCs in the specified JSON format.  Output will include an NPC statblock, a short description that would be suitable for further GPT memories and image generation with Dall-E, a back story, items, attacks, spells and armor that may be relevent to the character (don't be afraid to add many), and any affiliations or relationships. You will only output the described attributes, without any fluff.

{
  "npc": {
      "name": "",
      "type": "npc",
      "system": {
          "abilities": {
              "str": { "value": "", "proficient": "0/1" },
              "dex": { "value": "", "proficient": "0/1" },
              "con": { "value": "", "proficient": "0/1" },
              "int": { "value": "", "proficient": "0/1" },
              "wis": { "value": "", "proficient": "0/1" },
              "cha": { "value": "", "proficient": "0/1" }
          },
  
          "skills": {
              "acr": { "value": "" }, (0.5 for half proficient, 1 for proficient, 2 for expertise)
              "ani": { "value": "" },
              "arc": { "value": "" },
              "ath": { "value": "" },
              "dec": { "value": "" },
              "his": { "value": "" },
              "ins": { "value": "" },
              "inv": { "value": "" },
              "itm": { "value": "" },
              "med": { "value": "" },
              "nat": { "value": "" },
              "per": { "value": "" },
              "prc": { "value": "" },
              "prf": { "value": "" },
              "rel": { "value": "" },
              "slt": { "value": "" },
              "ste": { "value": "" },
              "sur": { "value": "" }
          },
  
          "attributes": {
              "ac": {
                  "value": "",
                  "calc": "" (default, flat, natural)
              }"", (make sure to add armor below if ac is higher than normal)
              "movement": { (these should all be integer values)
                  "burrow": "",
                  "climb": "",
                  "fly": "",
                  "swim": "",
                  "walk": ""
              },
              "senses": { (these should all be interger values)
                  "darkvision": "",
                  "blindsight": "",
                  "truesight": ""
              },
              "hp": {
                  "formula": "",
                  "value": "",
                  "max": ""
              },
              "spellcasting": "(int/wis)"
          },
  
          "details": {
              "biography": { "value": "" },
              "alignment": "", (Full name, not an abbreviation)
              "cr": "", (If under 1, use a decimal for this cr level)
              "spellLevel": "",
              "type": { "value": "(ex:) humanoid" }
          },
  
          "traits": {
              "size": "(tiny/sm/med/lg/huge/grg)",
              "languages": { "value": [] },
              "ci": { "value": [] },
              "di": { "value": [] },
              "dr": { "value": [] },
              "dv": { "value": [] }
          }
      }
  },
  "bonus": {
      "bonus": {
          "items": [{
              "name": "",
              "type": "(consumable, equipment, backpack, loot, weapon, tool) (if it's an action, choose "weapon")",
              "system":{
                  "actionType": "",
                  "activation": { "type": "action"},
                  "attunement": "0/1",
                  "damage": {
                      "versatile": "(1d8 + @mod)"
                  }
              },
              "description": ""
          }],
          "actions": [{
              "name": "",
              "type": "(consumable, equipment, backpack, loot, weapon, tool) (if it's an action, choose "weapon")",
              "system":{
                  "actionType": "",
                  "activation": { "type": "action"},
                  "attunement": "0/1",
                  "damage": {
                      "versatile": "(1d8 + @mod)"
                  }
              },
              "description": ""
          }],
          "spells": {
              "0": [],
              "1": [], etc...
            },
          "armor": [{
              "name": "",
              "type": "(consumable, equipment, backpack, loot, weapon, tool) (if it's an action, choose "weapon")",
              "system": {
                  "armor": {
                      "type": "",
                      "value": "",
                      "dex": ""
                  }
              },
              "description": ""
          }]
      }

  },
  "description": {
      "dalle": "",
      "background": "",
      "affiliations": ""
  }
}
`;
}

// Initialize llmSettings
Hooks.once("init", () => {
  llmSettings.initialize();
});

// Example of a GET request using fetch in FoundryVTT
fetch("http://json.schemastore.org/launchsettings.json")
  .then((response) => {
    // Check if the request was successful
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();
  })
  .then((data) => {
    console.log("Data fetched:", data);
    // Handle the data here
  })
  .catch((error) => {
    console.error("Fetch error:", error);
  });

// Add extra secret settings
Hooks.on('renderSettingsConfig', (app, html, data) => {
    // Localization
    const apiKeyName = game.i18n.localize(`CHAT-BOT.settings.${llmSettings.SETTINGS.API_KEY}.Name`);
    const apiKeyHint = game.i18n.localize(`CHAT-BOT.settings.${llmSettings.SETTINGS.API_KEY}.Hint`);
    const secretKeyName = game.i18n.localize(`CHAT-BOT.settings.${llmSettings.SETTINGS.SECRET_KEY}.Name`);
    const secretKeyHint = game.i18n.localize(`CHAT-BOT.settings.${llmSettings.SETTINGS.SECRET_KEY}.Hint`);

    // Identify where to insert your custom field, e.g., at the end of the form
    const form = html.find(`[data-category="llm-lib"]`);
    const count = html.find(`[data-tab="llm-lib"]`);
    const updateCount = count.find(`[class="count"]`);
    updateCount.innerHTML = `[3]`;

    const apiKeyFormGroup = document.createElement('div');
    apiKeyFormGroup.classList.add('form-group');
    apiKeyFormGroup.innerHTML = `
        <label>${apiKeyName}:</label>
        <input type="password" name="${llmSettings.ID}.${llmSettings.SETTINGS.API_KEY}" value="${game.settings.get(llmSettings.ID, llmSettings.SETTINGS.API_KEY)}" data-dtype="String">
        <p class="notes">${apiKeyHint}</p>
    `;

    const secretKeyFormGroup = document.createElement('div');
    secretKeyFormGroup.classList.add('form-group');
    secretKeyFormGroup.innerHTML = `
        <label>${secretKeyName}:</label>
        <input type="password" name="${llmSettings.ID}.${llmSettings.SETTINGS.SECRET_KEY}" value="${game.settings.get(llmSettings.ID, llmSettings.SETTINGS.SECRET_KEY)}" data-dtype="String">
        <p class="notes">${secretKeyHint}</p>
    `;

    // Append your custom form group to the settings window
    form.append(apiKeyFormGroup);
    form.append(secretKeyFormGroup);

    // Optionally, add an event listener to save the setting when the form is submitted
    // app.options.onSubmit = (e) => {
    //     e.preventDefault();
    //     const newSecretKey = e.target.querySelector(`input[name="${llmSettings.ID}.${llmSettings.SETTINGS.SECRET_KEY}"]`).value;
    //     game.settings.set('my-module-name', 'my-password', newSecretKey);
    // };
});