package search

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/binary"
	"encoding/hex"
	"errors"
	"fmt"
	"math"
	"strings"

	"github.com/gobwas/glob"
	"github.com/luxfi/crypto"
	e "github.com/luxfi/geth/common"
)

// ErrInvalidPattern reports a pattern that cannot be turned into a matcher.
var ErrInvalidPattern = errors.New("invalid pattern")

type matcher func(e.Address) bool

// Config describes a CREATE2 vanity address search.
type Config struct {
	// Pattern is the hex prefix, suffix or glob the address must match.
	Pattern string
	// Deployer is the address of the contract performing the CREATE2 deployment.
	Deployer e.Address
	// InitcodeHash is keccak256 of the initcode being deployed.
	InitcodeHash e.Hash
}

// Pair is a matching salt and the address derived from it.
type Pair struct {
	salt    string
	address string
}

// Salt returns the 32-byte salt as hex without the "0x" prefix.
func (p *Pair) Salt() string { return p.salt }

// Address returns the derived address in EIP-55 checksummed form.
func (p *Pair) Address() string { return p.address }

// addressHasher derives CREATE2 addresses without allocating on every nonce.
// Its buffer mirrors keccak256(0xff ++ deployer ++ salt ++ initcodeHash).
type addressHasher struct {
	state crypto.KeccakState
	buf   [85]byte
	out   [32]byte
}

func newAddressHasher(deployer e.Address, initcodeHash []byte, saltPrefix []byte) *addressHasher {
	h := &addressHasher{state: crypto.NewKeccakState()}
	h.buf[0] = 0xff
	copy(h.buf[1:21], deployer[:])
	copy(h.buf[21:53], saltPrefix)
	copy(h.buf[53:85], initcodeHash)
	return h
}

func (h *addressHasher) address(nonce uint64) e.Address {
	binary.BigEndian.PutUint64(h.buf[45:53], nonce)
	h.state.Reset()
	h.state.Write(h.buf[:])
	h.state.Read(h.out[:])

	var address e.Address
	copy(address[:], h.out[12:])
	return address
}

func (h *addressHasher) salt(nonce uint64) [32]byte {
	var salt [32]byte
	copy(salt[:24], h.buf[21:45])
	binary.BigEndian.PutUint64(salt[24:], nonce)
	return salt
}

// SearchVanity searches for a salt whose CREATE2 address matches the configured
// pattern. It stops once a match is found or ctx is done, and returns a nil Pair
// when the 64-bit nonce space is exhausted.
func SearchVanity(ctx context.Context, config *Config) (*Pair, error) {
	match, err := newMatcher(config.Pattern)
	if err != nil {
		return nil, err
	}

	var saltPrefix [24]byte
	if _, err := rand.Read(saltPrefix[:]); err != nil {
		return nil, fmt.Errorf("generate random salt prefix: %w", err)
	}

	hasher := newAddressHasher(
		config.Deployer,
		config.InitcodeHash.Bytes(),
		saltPrefix[:],
	)

	for i := uint64(0); ; i++ {
		if i&0x3ff == 0 {
			if err := ctx.Err(); err != nil {
				return nil, err
			}
		}

		address := hasher.address(i)
		if match(address) {
			matchedSalt := hasher.salt(i)
			return &Pair{
				salt:    hex.EncodeToString(matchedSalt[:]),
				address: address.Hex(),
			}, nil
		}

		if i == math.MaxUint64 {
			break
		}
	}

	return nil, nil
}

// newMatcher turns a hex pattern into a predicate over raw address bytes.
//
// An optional "0x" prefix is accepted. An empty pattern or "*" matches any
// address. A pattern without wildcards is treated as a prefix. A single trailing
// "*" selects prefix matching and a single leading "*" selects suffix matching;
// other wildcard combinations fall back to the generic glob engine.
func newMatcher(pattern string) (matcher, error) {
	p := strings.TrimPrefix(strings.ToLower(strings.TrimSpace(pattern)), "0x")

	switch {
	case p == "" || p == "*":
		return func(e.Address) bool { return true }, nil
	case !hasGlobMeta(p):
		return newPrefixMatcher(p)
	case strings.HasSuffix(p, "*") && !hasGlobMeta(p[:len(p)-1]):
		return newPrefixMatcher(p[:len(p)-1])
	case strings.HasPrefix(p, "*") && !hasGlobMeta(p[1:]):
		return newSuffixMatcher(p[1:])
	default:
		g, err := glob.Compile(p)
		if err != nil {
			return nil, fmt.Errorf("%w: %w", ErrInvalidPattern, err)
		}
		return func(address e.Address) bool {
			return g.Match(hex.EncodeToString(address[:]))
		}, nil
	}
}

func hasGlobMeta(s string) bool {
	return strings.ContainsAny(s, `*?[{\`)
}

func newPrefixMatcher(prefix string) (matcher, error) {
	nibbles, err := parseNibbles(prefix)
	if err != nil {
		return nil, err
	}

	full := len(nibbles) / 2
	prefixBytes := make([]byte, full)
	for i := range full {
		prefixBytes[i] = nibbles[2*i]<<4 | nibbles[2*i+1]
	}
	odd := len(nibbles)%2 == 1
	var last byte
	if odd {
		last = nibbles[len(nibbles)-1]
	}

	return func(address e.Address) bool {
		if full > 0 && !bytes.Equal(prefixBytes, address[:full]) {
			return false
		}
		return !odd || address[full]>>4 == last
	}, nil
}

func newSuffixMatcher(suffix string) (matcher, error) {
	nibbles, err := parseNibbles(suffix)
	if err != nil {
		return nil, err
	}

	n := len(nibbles)
	full := n / 2
	suffixBytes := make([]byte, full)
	for i := range full {
		idx := n - 2*(i+1)
		suffixBytes[full-1-i] = nibbles[idx]<<4 | nibbles[idx+1]
	}
	odd := n%2 == 1
	var lead byte
	if odd {
		lead = nibbles[0]
	}

	return func(address e.Address) bool {
		if full > 0 && !bytes.Equal(suffixBytes, address[e.AddressLength-full:]) {
			return false
		}
		return !odd || address[e.AddressLength-full-1]&0x0f == lead
	}, nil
}

func parseNibbles(s string) ([]byte, error) {
	if len(s) > 2*e.AddressLength {
		return nil, fmt.Errorf(
			"%w: pattern is longer than an address (%d hex chars)",
			ErrInvalidPattern, 2*e.AddressLength,
		)
	}

	nibbles := make([]byte, len(s))
	for i := 0; i < len(s); i++ {
		n, ok := hexNibble(s[i])
		if !ok {
			return nil, fmt.Errorf(
				"%w: invalid hex character %q in pattern",
				ErrInvalidPattern, rune(s[i]),
			)
		}
		nibbles[i] = n
	}

	return nibbles, nil
}

func hexNibble(c byte) (byte, bool) {
	switch {
	case '0' <= c && c <= '9':
		return c - '0', true
	case 'a' <= c && c <= 'f':
		return c - 'a' + 10, true
	case 'A' <= c && c <= 'F':
		return c - 'A' + 10, true
	}
	return 0, false
}
