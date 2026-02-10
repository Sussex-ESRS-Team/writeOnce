# Project Specification
# WriteOnce Blog Engine

# Summary

The WriteOnce Blog Engine is a flexible and secure blog engine, similar to WordPress, but with a much more powerful way of handling how posts are written, stored and displayed.
The innovative part of the project is that the blog posts are stored as 'intermediary representation (IR)' that allows them to be written in a range of languages, but also displayed and exported in other formats in the future, whilst still maintaining their formatting. In this 12 week project we will develop a prototype of the Blog Engine and if time allows add functionality around accessibility, security and improvements to the user interface.

# Team roles

Project Manager: Paula Blackledge 
Technical Lead: Mei Happs
Frontend Developer: Max De La Nougerede
Backend Developer: Tim Bartlett

# Intended audience

The blog engine is an ideal solution for writers and organisations that need flexible ways to write blogs. They can write the blogs in a format that suits them whilst still producing clean and well formatted posts, that meet good standards by default. For those working one a blog within a team, the flexibility of the IR means different people can work on the blogs in their preferred format and it also future proofs the blogs as the post can be re-exported in multiple formats.

# Constraints of the approach
Our WriteOnce Blog Engine will be based around a single structured representation, so a major constraint is that we may not be able to represent all required features within this model. Alongside this, because of time restrictions, it is unlikely we will produce a version on WriteOnce that will provide a rich interface for blog editors. These constraints are traded off by the long-term advantages of the approach that allows for easy conversion to other formats whilst still maintaing it's structure.

todo:
- add sections:
  - scalability
  - architecture diagram? lower prio but would be v nice
- Decide on language or give clear specification for language requirements
  - mix of languages? some systems language for the IR and typescript for the actual website

# Milestone

- decide on systems language for IR handling (by 13th February)
- usable editor supporting pure html (syntax highlighting in a textbox) (week 4)
- secure login area finished (week 4)
- live preview (week 4)
- support for markdown generating html directly (week 5)
- intermediary representation fully specified (week 5)
- Start Testing (week 6)
- IR to html and vice versa supported (week 7+8)
- Accessibility checker (week 9)
- IR to markdown and vice versa supported (week 10)
- IR to other formats (week 11)

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

### Language and Technology Stack

After evaluating several options for implementing the intermediary representation and overall system architecture, we have decided to use TypeScript for the entire project stack. This section outlines our evaluation process and rationale.

#### Language Evaluation

##### Rust

Advantages:
- Exceptionally robust type system with algebraic data types (enums with associated data)
- Native pattern matching with exhaustive checking and destructuring
- Zero-cost abstractions and excellent performance characteristics
- Memory safety guarantees without garbage collection
- Strong support for functional programming paradigms
- TreeSitter has excellent Rust bindings
- Can compile to WebAssembly for potential browser integration

Disadvantages:
- Steep learning curve, particularly around ownership and borrowing concepts
- Only one team member has prior Rust experience
- Ecosystem instability: frequent breaking changes in frameworks and libraries
- Documentation outside of core language resources is often inconsistent or outdated
- Framework churn would introduce timeline risk in a 12-week project

##### TypeScript

Advantages:
- Entire team has experience with JavaScript/TypeScript
- Genuinely robust type system with discriminated unions and type narrowing
- Exhaustive type checking at compile time
- Mature, stable ecosystem with well-documented libraries
- Seamless integration between frontend and backend (one language throughout)
- Strong TreeSitter bindings available
- Large community means extensive Stack Overflow/documentation resources
- Fast iteration and development velocity
- End-to-end type safety from database to UI

Disadvantages:
- Not a systems language - lower raw performance than Rust
- Types exist only at compile time, requiring runtime validation for external data
- No native pattern matching syntax
- Less elegant syntax for complex type transformations compared to Rust
- Type system, while sophisticated, requires more verbose type definitions for complex cases

##### C++

While C++ offers performance characteristics similar to Rust, it is a poor fit for our requirements:

- Type safety: C++ lacks algebraic data types and exhaustive pattern matching. Implementing our IR would require error-prone manual type checking with `dynamic_cast` or visitor patterns
- Memory safety: Manual memory management introduces entire categories of bugs (use-after-free, memory leaks, buffer overflows) that are completely avoided in both Rust and TypeScript
- Modern tooling: C++ build systems and dependency management are notoriously complex compared to cargo (Rust) or npm (TypeScript)
- Development velocity: The combination of manual memory management, weak type safety for sum types, and verbose syntax would significantly slow development

C++ represents the worst of both worlds for our use case: the complexity of a systems language without the safety guarantees of Rust, and none of the developer ergonomics of TypeScript.

#### Bridging the Gap: ts-pattern

One of TypeScript's main limitations compared to Rust is the lack of native pattern matching syntax. However, the `ts-pattern` library provides sophisticated pattern matching capabilities that closely approximate Rust's experience:

Features provided by ts-pattern:
- Exhaustive pattern matching with compile-time checking
- Destructuring in pattern expressions
- Guard clauses with `P.when()`
- Nested pattern matching for complex data structures
- Type narrowing with full TypeScript integration
- Pattern matching on values, not just types

Example comparison:
```typescript
import { match } from 'ts-pattern';

function renderNode(node: IRNode): string {
  return match(node)
    .with({ kind: 'header', level: 1 }, ({ content }) =>
      `<h1>${content}</h1>`)
    .with({ kind: 'header' }, ({ level, content }) =>
      `<h${level}>${content}</h${level}>`)
    .with({ kind: 'bulletList' }, ({ items }) =>
      `<ul>${items.map(renderBullet).join('')}</ul>`)
    .with({ kind: 'numberedList' }, ({ items }) =>
      `<ol>${items.map(renderNumber).join('')}</ol>`)
    .exhaustive(); // Compiler error if cases are missing
}
```

This provides the functional, type-safe transformation logic that makes Rust pleasant to work with, while maintaining TypeScript's accessibility and ecosystem stability.

ts-pattern details:
- Actively maintained community library
- Mature, stable API
- Adds minimal runtime overhead
- Will be central to our IR transformation pipeline

#### Final Decision: TypeScript

Given our project constraints and goals, we have chosen TypeScript for the following reasons:

Team and Timeline Alignment:
With 12 weeks and only one team member experienced in Rust, TypeScript maximizes our development velocity and allows all team members to contribute effectively from day one.

Technical Sophistication:
TypeScript's type system, enhanced with `ts-pattern`, provides the type safety and pattern matching capabilities necessary for sophisticated IR transformations. We can demonstrate technical depth through:
- Complex discriminated union types modeling our IR
- Exhaustive pattern matching for bidirectional transformations
- TreeSitter integration for parsing
- End-to-end type safety across the entire stack
- Property-based testing for IR transformation correctness

Ecosystem Maturity:
The stable TypeScript/Node.js ecosystem reduces risk of mid-project breaking changes, ensuring we can focus on delivering features rather than fighting tooling issues.

Performance Adequacy:
For a blog engine, TypeScript's performance is more than sufficient. The IR transformations are not computationally intensive enough to warrant systems-language performance characteristics.

This approach prioritizes delivering a complete, well-architected system on schedule while maintaining the technical sophistication expected of a masters-level project.

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
