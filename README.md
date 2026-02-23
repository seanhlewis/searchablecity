# Searchable City

<img width="4800" height="1200" alt="searchablecityheadernewnew" src="https://github.com/user-attachments/assets/4a002a45-a7f8-4bf8-9fcd-258dfa80e2b6" />



<br>

**The first open-vocabulary semantic atlas of New York City.**

I ran a Vision Language Model on millions of images of New York City to create a searchable visual index of the city. This project moves beyond the rigid grid of addresses to map the invisible systems (culture, wealth, infrastructure, etc.) that actually define the urban experience.

### [🌐 Interactive Map & Full Story](https://searchable.city/about)

---

## Details

Maps are blind. To Google or Apple, the city is a grid of addresses and listings. The rest of the world gets flattened. The map can tell you where a pharmacy is, but it cannot tell you where the fire escapes are, where the murals are, or where the street trees actually cast shade.

I sought to address this mapping gap. By processing street view imagery with a Vision Language Model (VLM), I did not ask the computer for coordinates; but rather asked it to *look*. At scale, it effectively translated the visual noise of the street into structured data, turning pixels into patterns and moving from a map of location to a map of meaning.

### Inspiration

Every ten years, New York City conducts a massive, manual census of its street trees. Thousands of volunteers walk every block with clipboards, counting and identifying every oak and maple. They do it because the digital map does not know the trees exist.

I wanted to explore: if a human can look at a street corner and see "gentrification," "neglect," or "culture," can a machine do the same? Can we automate the perception of urban biology?

### Overview

Standard maps rely on manual entry into databases. I used a supercomputer to "watch" the city instead. By generating hundreds of descriptive tags for every street view image in New York City, I created a searchable visual index.

<div align="center">
<figure>
<img width="1750" height="1009" alt="chinese_searchable_city_new" src="https://github.com/user-attachments/assets/e824e948-2907-490c-855c-0e8c2da3f875" />

  
  <figcaption><em>When we query "Chinese," it successfully delineates Chinatown without knowing a single zip code.</em></figcaption>
</figure>
</div>
<br>

When we query **"Chinese,"** the AI identifies architectural patterns, signage density, and color palettes. It successfully delineates Chinatown without knowing a single zip code. When we query **"Gothic,"** it reveals the 19th-century spine of the city (churches, universities, and older civic buildings) separating the historic from the modern glass towers.

<div align="center">
<figure>
  <img width="1750" height="1009" alt="gothic_searchable_city_new" src="https://github.com/user-attachments/assets/6d78f71f-e180-4326-b47c-76f40bc073c5" />


  <figcaption><em>Querying "Gothic" reveals the historic spine of New York City, distinct from the glass of modern skyscrapers.</em></figcaption>
</figure>
</div>
<br>

### The Ghost in the Machine

This was the most unexpected finding in the dataset. When we queried **"East"** vs **"West,"** the model accurately lit up the respective sides of Manhattan.

<table>
  <tr>
    <td align="center">
<img width="1750" height="1009" alt="west_searchable_city_west" src="https://github.com/user-attachments/assets/5338ed34-46ea-4a52-aac9-b817203e3ec7"/>      
      <br />
      </td>
    <td align="center">
<img width="1750" height="1009" alt="east_searchable_city_new" src="https://github.com/user-attachments/assets/30c66eee-0160-4a61-ab2a-dc6f38635c26"/>
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
    <img width="1097" height="945" alt="scaffolding_indepth" src="https://github.com/user-attachments/assets/177ef082-9b58-48c3-a933-597eed21d4fa" />
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
<img width="2354" height="985" alt="bagel" src="https://github.com/user-attachments/assets/9fa24280-bb97-424c-8326-8e8c01fd45e9" />
  </td>
      <td valign="top">
        <h3>BAGEL</h3>
        <p>The breakfast of champions. Note the complete absence in industrial zones.</p>
      </td>
    </tr>
    <tr>
      <td>
      <img width="2354" height="985" alt="beer" src="https://github.com/user-attachments/assets/f2ca3021-ab99-451a-a481-312b41790dc6" />
      </td>
      <td valign="top">
        <h3>BEER</h3>
        <p>Identifies bars, advertisements, and bodegas with neon signage.</p>
      </td>
    </tr>
    <tr>
      <td>
      <img width="2354" height="985" alt="garbage" src="https://github.com/user-attachments/assets/5afce964-2b62-477b-b0e7-c50d3e27696f" />
      </td>
      <td valign="top">
        <h3>GARBAGE</h3>
        <p>Correlates with commercial density and foot traffic.</p>
      </td>
    </tr>
    <tr>
      <td>
      <img width="2354" height="985" alt="graffiti" src="https://github.com/user-attachments/assets/a5b370d3-3eca-4540-85e2-cff9c3c48e1a" />
      </td>
      <td valign="top">
        <h3>GRAFFITI</h3>
        <p>The unauthorized art layer of New York City.</p>
      </td>
    </tr>
    <tr>
      <td>
      <img width="2354" height="985" alt="flower" src="https://github.com/user-attachments/assets/45d74557-be2d-45d8-aaff-3e2479126633" />
      </td>
      <td valign="top">
        <h3>FLOWER</h3>
        <p>The city's landscape punctuated by seasonal blooms.</p>
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

<img width="1500" height="932" alt="chinese_look_new" src="https://github.com/user-attachments/assets/33c4969c-7c60-416e-a0d7-200f9243d170" />

<img width="1500" height="932" alt="gothic_look_new" src="https://github.com/user-attachments/assets/145a3e44-28c8-41d3-8cf9-2e4383fef4ac" />

<img width="1500" height="932" alt="scaffolding_look_new" src="https://github.com/user-attachments/assets/c5ecd6af-5e20-4bbb-ade4-694412a09549" />


### Special Thanks

Imagery from Google Maps. © 2025 Google LLC, used under fair use.

