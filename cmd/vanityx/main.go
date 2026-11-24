package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"runtime"
	"sync"
	"syscall"

	vs "github.com/liumingxun/vanityx/pkg/search"
	e "github.com/luxfi/geth/common"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "vanityx:", err)
		os.Exit(1)
	}
}

func run() error {
	pattern := flag.String(
		"pattern",
		"",
		"hex prefix, suffix or glob the address must match",
	)
	deployer := flag.String(
		"deployer",
		"",
		"CREATE2 deployer address",
	)
	initcodeHash := flag.String(
		"initcode-hash",
		"",
		"keccak256 of the initcode being deployed",
	)
	workers := flag.Int(
		"workers",
		runtime.NumCPU(),
		"number of goroutines searching in parallel",
	)
	flag.Parse()

	if *pattern == "" {
		return fmt.Errorf(`-pattern is required`)
	}
	if *deployer == "" {
		return fmt.Errorf("-deployer is required")
	}
	if *initcodeHash == "" {
		return fmt.Errorf("-initcode-hash is required")
	}
	if *workers < 1 {
		return fmt.Errorf("-workers must be at least 1, got %d", *workers)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pair, err := search(ctx, &vs.Config{
		Pattern:      *pattern,
		Deployer:     e.HexToAddress(*deployer),
		InitcodeHash: e.HexToHash(*initcodeHash),
	}, *workers)
	if err != nil {
		return err
	}
	if pair == nil {
		return fmt.Errorf("nonce space exhausted without a match")
	}

	fmt.Printf("salt:    %s\naddress: %s\n", pair.Salt(), pair.Address())
	return nil
}

// search fans the engine's single-threaded search out to workers goroutines and
// returns the first match. Each worker calls SearchVanity with its own random
// salt prefix, so workers do not repeat each other's salts.
func search(ctx context.Context, config *vs.Config, workers int) (*vs.Pair, error) {
	if workers == 1 {
		return vs.SearchVanity(ctx, config)
	}

	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	type outcome struct {
		pair *vs.Pair
		err  error
	}

	// The buffer fits one outcome per worker, so no worker blocks even when the
	// first match returns early.
	outcomes := make(chan outcome, workers)
	var wg sync.WaitGroup
	for range workers {
		wg.Go(func() {

			pair, err := vs.SearchVanity(ctx, config)
			outcomes <- outcome{pair: pair, err: err}
			if pair != nil {
				cancel()
			}
		})
	}

	go func() {
		wg.Wait()
		close(outcomes)
	}()

	var firstErr error
	for result := range outcomes {
		if result.pair != nil {
			return result.pair, nil
		}
		if result.err != nil &&
			!errors.Is(result.err, context.Canceled) &&
			!errors.Is(result.err, context.DeadlineExceeded) &&
			firstErr == nil {
			firstErr = result.err
		}
	}
	if firstErr != nil {
		return nil, firstErr
	}
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	return nil, nil
}
