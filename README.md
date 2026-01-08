# Searchable City

<img width="4800" height="1200" alt="searchablecityheader" src="https://github.com/user-attachments/assets/c099f957-1381-44ab-80cc-8c40b14b887b" />


<br>

**The first open-vocabulary semantic atlas of New York City.**

I ran a Vision Language Model on hundreds of thousands of images of Manhattan to create a searchable visual index of the city. This project moves beyond the rigid grid of addresses to map the invisible systems (culture, wealth, infrastructure, etc.) that actually define the urban experience.

### [🌐 Interactive Map & Full Story](https://searchable.city/about)

---

## Details

Maps are blind. To Google or Apple, the city is a grid of addresses and listings. The rest of the world gets flattened. The map can tell you where a pharmacy is, but it cannot tell you where the fire escapes are, where the murals are, or where the street trees actually cast shade.

<img width="1118" height="423" alt="image" src="https://github.com/user-attachments/assets/2f32ba90-c6bd-4a09-84d1-e11c66c1e604" />
<br>

I sought to address this mapping gap. By processing street view imagery with a Vision Language Model (VLM), I did not ask the computer for coordinates; but rather asked it to *look*. At scale, it effectively translated the visual noise of the street into structured data, turning pixels into patterns and moving from a map of location to a map of meaning.

### Inspiration

Every ten years, New York City conducts a massive, manual census of its street trees. Thousands of volunteers walk every block with clipboards, counting and identifying every oak and maple. They do it because the digital map does not know the trees exist.

I wanted to explore: if a human can look at a street corner and see "gentrification," "neglect," or "culture," can a machine do the same? Can we automate the perception of urban biology?

### Overview

Standard maps rely on manual entry into databases. I used a supercomputer to "watch" the city instead. By generating hundreds of descriptive tags for every street view image in Manhattan, I created a searchable visual index.

<div align="center">
<figure>
<img width="1920" height="945" alt="chinese_searchable_city" src="https://github.com/user-attachments/assets/19ceedba-60e1-495f-91c7-c6ea43db99e6" />
  <figcaption><em>When we query "Chinese," it successfully delineates Chinatown without knowing a single zip code.</em></figcaption>
</figure>
</div>
<br>

When we query **"Chinese,"** the AI identifies architectural patterns, signage density, and color palettes. It successfully delineates Chinatown without knowing a single zip code. When we query **"Gothic,"** it reveals the 19th-century spine of the city (churches, universities, and older civic buildings) separating the historic from the modern glass towers.

<div align="center">
<figure>

  <img width="1920" height="945" alt="gothic_searchable_city" src="https://github.com/user-attachments/assets/95429cb3-60b1-4798-8d0e-f0ef85de31d5" />

  <figcaption><em>Querying "Gothic" reveals the historic spine of Manhattan, distinct from the glass of Midtown.</em></figcaption>
</figure>
</div>
<br>

### The Ghost in the Machine

This was the most unexpected finding in the dataset. When we queried **"East"** vs **"West,"** the model accurately lit up the respective sides of the island.

<table>
  <tr>
    <td align="center">
      <img src="https://github.com/user-attachments/assets/c8673a41-0c74-4ead-a943-b39cc9ac06d4" width="100%" alt="west_searchable_city" />
      <br />
      </td>
    <td align="center">
      <img src="https://github.com/user-attachments/assets/102fc582-9f24-44c3-b0cd-6d5c8e8bf31c" width="100%" alt="east_searchable_city" />
      <br />
      </td>
  </tr>
</table>

Is it reading street signs? Shadows? The model somehow figured out which way it was facing just by analyzing the image data.

### The Decoded City

When you stop looking for addresses and start looking for *patterns*, the invisible becomes obvious.

<table>
  <tr>
    <td align="center">
    <img width="1097" height="945" alt="scaffolding_indepth" src="https://github.com/user-attachments/assets/b909c8b3-0931-4f88-a7b9-10b4dce3f44b" />
    <figcaption><em>An in-depth look at the query "scaffolding."</em></figcaption>
      <br />
      </td>
    <td align="center">
    <img width="1097" height="945" alt="conditioning_indepth" src="https://github.com/user-attachments/assets/cc499aba-1ef2-462b-814e-eaaedc54bf56" />
    <figcaption><em>An in-depth look at the query "conditioning."</em></figcaption>
      <br />
      </td>
  </tr>
</table>

#### Perpetual Construction
Mapping scaffolding is effectively a way to map change. It shows where money is being spent on renovation, and where Local Law 11 is forcing facade repairs. It captures the temporary city, frozen in 2025.

#### The Air Conditioner
Consider the air conditioner. As modern HVAC systems retro-fit the skyline, the window unit becomes a marker of building age and socioeconomic strata. A semantic query instantly lights up every wall sleeve or hanging unit across the boroughs, revealing the city's pace of renovation in real-time.

### The Visual Language

I found over 3,000 unique descriptive tags. Here are some of the ones I thought were interesting (more on [the Searchable City website](https://searchable.city/about)):

<table>
  <thead>
    <tr>
      <th width="45%">Visualization</th>
      <th width="55%">Query & Observation</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <img src="https://github.com/user-attachments/assets/8da34fc6-b1dc-4a47-ada3-a3d0a7941cf6" width="100%" alt="bagel" />
      </td>
      <td valign="top">
        <h3>BAGEL</h3>
        <p>The breakfast of champions. Note the complete absence in industrial zones.</p>
      </td>
    </tr>
    <tr>
      <td>
        <img src="https://github.com/user-attachments/assets/953d16ac-0b8e-430a-8603-b3b1aa558244" width="100%" alt="beer" />
      </td>
      <td valign="top">
        <h3>BEER</h3>
        <p>Identifies bars, advertisements, and bodegas with neon signage.</p>
      </td>
    </tr>
    <tr>
      <td>
        <img src="https://github.com/user-attachments/assets/d681a289-11b0-4820-955d-2f3c36490229" width="100%" alt="trash" />
      </td>
      <td valign="top">
        <h3>TRASH</h3>
        <p>Correlates strictly with commercial density and foot traffic.</p>
      </td>
    </tr>
    <tr>
      <td>
        <img src="https://github.com/user-attachments/assets/2737f288-c5c1-4341-961a-c7c0b5c3034e" width="100%" alt="graffiti" />
      </td>
      <td valign="top">
        <h3>GRAFFITI</h3>
        <p>The unauthorized art layer of the Lower East Side.</p>
      </td>
    </tr>
    <tr>
      <td>
        <img src="https://github.com/user-attachments/assets/c893c81c-fcb9-4501-89a2-89b022ec191f" width="100%" alt="baseball" />
      </td>
      <td valign="top">
        <h3>BASEBALL</h3>
        <p>Reveals the hidden green spaces of the city, from sandlots to stadiums.</p>
      </td>
    </tr>
  </tbody>
</table>

### The Blind Spots

However, this approach has inherent limitations. It is bound by the same physics as the human eye. A fire hydrant can vanish behind a double‑parked delivery truck. A basement entrance can dissolve into darkness.

<img width="1091" height="306" alt="image" src="https://github.com/user-attachments/assets/d9c0e078-d1fa-4c69-9790-54f6ee7f94ca" />

And then there are the structural blind spots: what the camera never sees. Courtyards. Lobbies. Rooftops. The private city behind the street wall. Unlike ground-truth datasets provided by the city, a visual index carries the biases of its vantage point. It sees what the street view car sees - no more, no less. So treat this atlas as a hypothesis engine, not a verdict.

### The Searchable Future

Imagine a city you can `Ctrl+F`.

Not a list of addresses: a living surface you can query. Search: “flood risk.” Search: “closed storefront.” Search: “stoops where people actually sit.”

We’re heading toward a continuous, searchable reality. As cameras multiply and refresh cycles compress, the map stops being a document and becomes a question you can ask at any moment. The interface is simple—a search bar—but what it returns is new: a city organized by meaning instead of coordinates.

<img width="1299" height="932" alt="image" src="https://github.com/user-attachments/assets/181bec4e-e689-492e-9345-5285c92457fc" />

<img width="1317" height="939" alt="image" src="https://github.com/user-attachments/assets/0eac6ae8-5622-409a-ad0f-5ef5a082792b" />

<img width="1316" height="931" alt="image" src="https://github.com/user-attachments/assets/a07fe44d-e55e-459d-a50a-78fd68d2c10a" />



### Special Thanks

Imagery from Google Maps. © 2025 Google LLC, used under fair use.

