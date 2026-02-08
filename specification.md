# WriteOnce (?Suggested name?) Blog Engine

Summary
(I am just adding a description here as I think it helps me totally get my head round it)
In this project we will build a flexible and secure blog engine, similar to WordPress, but with a much more powerful way of handling 
how posts are written, stored and displayed.
The innovative part of the project is that the blog posts are stored as 'intermediary representation (IR)' that allows them to be written
in a range of languages, but also displayed and exported in other formats in the future, whilst still maintaining their formatting.

Other sections to add:
Team roles, audience and constraints, scalability, architecture diagram?

#Timeline
13th February- Spec document in 
Deadline- presuming 1st or 2nd week in May 
What milestones shall we have??


## Infrastructure

### Routing

We'll need some form of routing. The specific router doesn't matter - they're all pretty much the same.

The routes we would need to provide would be:
- a home page (this would probably list blog posts in some searchable and/or ordered manner)
- a general route for blog posts
- a route for the secure admin area

### Post formatting and storage

This will partially come down to how we decide to format the posts. We have many choices here, such as:
- Plaintext with predefined plaintext sequences for "special" datatypes. i.e. in markdown i think you can use something like:
  ```
  ![[image_name]]
  ```
  to get images inserted into your plaintext.
- Some structured format like json or some other languages object notation in which a similar kind of thing would be encoded with:
  ```
  [
    {
      "type": "plaintext",
      "content": "some text"
    },
    {
      "type": "image",
      "image_path": "./imgs/some_image.png"
    },
    {
      "type": "plaintext",
      "content": "some more text"
    }
  ]
  ```
- raw html (not preferred (icky))

Once format is established, we can worry about storage. Different formats lend themselves better to different storages, but a standard sql database probably won't be able to work with this without introducing a lot of jank.

### Security

We could implement an accounts system in a few ways:
- OAuth2: kinda annoying but would definitely be secure
- Sessions: simpler but the security aspect is more down to us to ensure
- JWT: even simpler than sessions but even harder to ensure security
- Hanko: prebuilt, easy to use and very secure (this would be my preferred choice unless we want to make the security infra a core part of this project)

### Intermediary Representation

This will be the core of the project.

With an intermediary representation, we can allow for many different "views" of a post, i.e. the intermediary representation isn't readible or directly usable but can easily be converted to and from html (priority no. 1), markdown, org and other plaintext formats. While viewing the post in another format, it's important to remember that the view is not a source of truth, just another way of looking at the intermediary representation for readibility.

With how I'm envisioning this be done, it will require a robust type system. What I'm thinking would be something along the lines of:
```md
# Example header

Some example paragraph.

- A
* Bulleted
- List
  - Maybe with
  - Indentation levels

1. Or even a
2. Numbered one
  - Maybe even
  - With a bulleted list under it
```

```IR
Header(level: 1, "Example header"),
LineBreak(),
"Some example paragraph.",
LineBreak(),
BulletedList([
  Bullet(bullet_character: {BulletCharacter::Markdown::Hyphen}, "A"),
  Bullet(bullet_character: {BulletCharacter::Markdown::Asterisk}, "Bulleted"),
  Bullet(bullet_character: {BulletCharacter::Markdown::Hyphen}, "List"),
  BulletedList(
    Bullet(bullet_character: {BulletCharacter::Markdown::Hyphen}, "Maybe with"),
    Bullet(bullet_character: {BulletCharacter::Markdown::Hyphen}, "Indentation levels")
  )
]),
LineBreak(),
NumberedList([
  Number("Or even a"),
  Number("Numbered one"),
  BulletedList([
    Bullet(bullet_character: {BulletCharacter::Markdown::Hyphen}, "Maybe even"),
    Bullet(bullet_character: {BulletCharacter::Markdown::Hyphen}, "With a bulleted list under it")
  ])
])
```

```IR types
Header(level: int, str)
LineBreak()
BulletedList(list[Bullet | BulletedList | NumberedList])
Bullet(bullet_character: set[BulletCharacter], str)
NumberedList(list[Number | NumberedList | BulletedList])
Number(str)

BulletCharacter {
  Markdown {
    Hyphen => "-", # default
    Asterisk => "*"
  }
}
```

This example is not a perfect representation, but it should hopefully get the idea across. (I'm hoping this format I've chosen for the types is clear enough to not need explanation, it is not a pre-existing type system, I just threw it together)
The types need to be exhaustive enough to cover everything in each domain while also ensuring it's possible to map every domain to the intermediary representation.

As an example, bullet_character is a set of enforced characters. This is because one domain may not have more than one bullet character, and therefore wouldn't enforce a bullet character when you write in it but other domains, like markdown, do. This approach allows for you to write in one format that has multiple bullet characters, edit in another format that has multiple bullet characters and have each time you view it maintain the characters you chose in both languages while also allowing languages with only one bullet character to not have to enforce any kind of memory.

I hope this makes it clear why a robust type system would be necessary, these types are quite complex, especially the bullet character type. A language like python would be near impossible to get this working in.

In terms of actually parsing these formats, I think it would be wise to use something like treesitter rather than making it from the ground up ourselves. Treesitter is well-established and consistent and it would be interesting to approach this by making a treesitter for our own domain specific language (the intermediate representation).

### Secure Admin Area

#### Post creator

There would be a few parts to this creator:
- Editor
- (live?) Preview
- Publishing
- Save without publishing
- Save and publish
- Delete/archive
These are all essentially mandatory, though the level of effort we put into each can be very variable.

##### Editor + Preview

Minimum Viable Product:
- a textbox with an iframe next to it that contains the processed contents of the textbox, refreshing on a time delay with some processing in between

Mid-viable product
- Can we somewhere inbetween these two options consider an accessibility checker/enforcer or the parser by default making accessibility add-ons? Would forcing them to write a summary or opening paragraph from which metadata/blog post summmary be pulled

Maximum Feasible Product:
- a fully embedded live preview and editor in the same pane, similar to what obsidian does, in which only the line being edited is shown as plaintext while the rest is properly rendered
